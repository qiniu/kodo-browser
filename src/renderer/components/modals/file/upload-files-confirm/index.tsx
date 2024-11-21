import {promises as fsPromises} from "fs";
import path from "path";

import React, {Fragment, useEffect, useMemo, useState} from "react";
import {Button, Form, Modal, ModalProps, OverlayTrigger, Popover, Spinner} from "react-bootstrap";
import {SubmitHandler, useForm} from "react-hook-form";
import {toast} from "react-hot-toast";

import {BackendMode} from "@common/qiniu";
import StorageClass from "@common/models/storage-class";

import {Translate, useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {useFileOperation} from "@renderer/modules/file-operation";
import ipcUploadManager from "@renderer/modules/electron-ipc-manages/ipc-upload-manager";
import * as AuditLog from "@renderer/modules/audit-log";
import {useEndpointConfig} from "@renderer/modules/user-config-store";

import LoadingHolder from "@renderer/components/loading-holder";

interface TipPopoverProps {
  className: string,
  onClickRefresh: () => void,
}

const TipPopover: React.FC<TipPopoverProps> = ({
  className,
  onClickRefresh,
}) => {
  const {translate} = useI18n();

  const [show, setShow] = useState(false);
  const handleToggle = (nextShow: boolean) => {
    if (!show) {
      setShow(nextShow);
    }
  };
  const handleMouseEnter = () => {
    setShow(true);
  };
  const handleMouseLeave = () => {
    setShow(false);
  };
  return (
    <div className={className}>
      <OverlayTrigger
        placement="right"
        show={show}
        onToggle={handleToggle}
        overlay={
          <Popover
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Popover.Body>
              {translate("modals.uploadConfirm.popupHint.question")}
              <br />
              <span
                tabIndex={0}
                className="text-link"
                onClick={() => onClickRefresh()}
                onKeyUp={e => e.code === "Space" && onClickRefresh()}
              >
                {translate("modals.uploadConfirm.popupHint.clickHere")}
              </span>
              {translate("modals.uploadConfirm.popupHint.refreshIt")}
            </Popover.Body>
          </Popover>
        }
      >
        <i className="bi bi-question-circle-fill"/>
      </OverlayTrigger>
    </div>
  );
};

interface UploadFilesConfirmProps {
  filePaths: string[],
  maxShowFiles?: number,
  storageClasses: StorageClass[],
  regionId: string,
  bucketName: string,
  destPath: string,
  canAccelerateUploading?: boolean,
  onClickRefreshCanAccelerateUploading?: () => void,
}

interface FileShowItem {
  path: string,
  isDir: boolean,
  basename: string,
}

interface UploadFilesFormData {
  isOverwrite: boolean,
  accelerateUploading: boolean,
  storageClassKodoName: string,
}

const MAX_SHOW_FILES = 200;

const statFiles = async (filePaths: string[], maxShowFiles: number): Promise<FileShowItem[]> => {
  const fileShowList: FileShowItem[] = [];
  for (let filePath of filePaths.slice(0, maxShowFiles)) {
    const isDirectory = (await fsPromises.stat(filePath)).isDirectory();
    fileShowList.push({
      path: filePath,
      isDir: isDirectory,
      basename: path.basename(filePath),
    })
  }
  return fileShowList;
}

const UploadFilesConfirm: React.FC<ModalProps & UploadFilesConfirmProps> = ({
  filePaths,
  maxShowFiles = MAX_SHOW_FILES,
  storageClasses,
  regionId,
  bucketName,
  destPath,
  canAccelerateUploading = false,
  onClickRefreshCanAccelerateUploading,
  ...modalProps
}) => {
  const {currentLanguage, translate} = useI18n();
  const {currentUser, shareSession} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  const {
    endpointConfigData,
  } = useEndpointConfig(currentUser, shareSession);

  // cache operation states prevent props update after modal opened.
  const {
    memoFilePaths,
    memoRegionId,
    memoBucketName,
    memoDestPath,
    memoStorageClasses,
  } = useMemo(() => {
    if (modalProps.show) {
      return {
        memoFilePaths: filePaths,
        memoRegionId: regionId,
        memoBucketName: bucketName,
        memoDestPath: destPath,
        memoStorageClasses: storageClasses,
      };
    } else {
      return {
        memoFilePaths: [],
        memoRegionId: regionId,
        memoBucketName: bucketName,
        memoDestPath: destPath,
        memoStorageClasses: storageClasses,
      };
    }
  }, [modalProps.show]);

  const previewListI18nData = {
    total: memoFilePaths.length.toString(),
  };

  // file show list
  const [statingFiles, setStatingFiles] = useState(true);
  const [showFiles, setShowFiles] = useState<FileShowItem[]>([]);

  // form to upload files
  const {
    handleSubmit,
    register,
    reset,
    watch,
    formState: {
      // errors,
      isSubmitting,
    },
  } = useForm<UploadFilesFormData>({
    mode: "onChange",
    defaultValues: {
      isOverwrite: false,
      storageClassKodoName: storageClasses[0]?.kodoName ?? "Standard",
    },
  });

  const handleSubmitUploadFiles: SubmitHandler<UploadFilesFormData> = (data) => {
    if (!memoFilePaths.length || !currentUser) {
      return;
    }
    toast(translate("transfer.upload.hint.addingJobs"));
    AuditLog.log(AuditLog.Action.UploadFilesStart, {
      regionId: memoRegionId,
      bucket: memoBucketName,
      to: memoDestPath,
      from: memoFilePaths,
    });

    let backendMode = preferBackendMode;
    if (!backendMode) {
      backendMode = currentUser.endpointType === EndpointType.Public ? BackendMode.Kodo : BackendMode.S3;
    }

    ipcUploadManager.addJobs({
      filePathnameList: memoFilePaths,
      destInfo: {
        regionId: memoRegionId,
        bucketName: memoBucketName,
        key: memoDestPath,
      },
      uploadOptions: {
        accelerateUploading: data.accelerateUploading,
        isOverwrite: data.isOverwrite,
        storageClassName: data.storageClassKodoName,
        storageClasses: memoStorageClasses,
        // userNatureLanguage needs mid-dash but i18n using lo_dash
        // @ts-ignore
        userNatureLanguage: currentLanguage.replace("_", "-"),
      },
      clientOptions: {
        accessKey: currentUser.accessKey,
        secretKey: currentUser.accessSecret,
        sessionToken: shareSession?.sessionToken,
        bucketNameId: shareSession
          ? {
            [shareSession.bucketName]: shareSession.bucketId,
          }
          : undefined,
        ucUrl: endpointConfigData.ucUrl,
        regions: endpointConfigData.regions.map(r => ({
          id: "",
          s3Id: r.identifier,
          label: r.label,
          s3Urls: [r.endpoint],
        })),
        backendMode,
      },
    });
    modalProps.onHide?.();
  };

  // reset states when open/close modal
  useEffect(() => {
    if (modalProps.show) {
      reset({
        isOverwrite: false,
        storageClassKodoName: storageClasses[0]?.kodoName ?? "Standard",
        accelerateUploading: false,
      });
      statFiles(memoFilePaths, maxShowFiles)
        .then(fileShowList => {
          setShowFiles(fileShowList);
        })
        .finally(() => {
          setStatingFiles(false);
        });
    } else {
      setStatingFiles(true);
    }
  }, [modalProps.show]);

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-cloud-upload me-1"/>
          {translate("modals.uploadConfirm.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div>
          {translate("modals.uploadConfirm.previewList.title")}
        </div>
        {
          statingFiles
            ? <LoadingHolder/>
            : <ul className="scroll-max-vh-40">
              {
                showFiles.map(fileShowItem => (
                  <li key={fileShowItem.path}>
                    {
                      fileShowItem.isDir
                        ? <>
                          <i className="bi bi-folder-fill me-1 text-yellow"/>
                          {fileShowItem.path}
                        </>
                        : <>
                          <i className="bi bi-file-earmark me-1"/>
                          {fileShowItem.basename}
                        </>
                    }
                  </li>
                ))
              }
              {
                memoFilePaths.length > showFiles.length
                  ? <li>
                    <Translate
                      i18nKey="modals.uploadConfirm.previewList.more"
                      data={previewListI18nData}
                      slots={{
                        total: v => <b>{v}</b>
                      }}
                    />
                  </li>
                  : null
              }
            </ul>
        }
        <Form
          className="mx-5"
          onSubmit={handleSubmit(handleSubmitUploadFiles)}
        >
          <fieldset
            className="grid-auto grid-form label-col-1"
            disabled={isSubmitting}
          >
            <Form.Group as={Fragment} controlId="isOverwrite">
              <Form.Label className="text-end">
                {translate("modals.uploadConfirm.form.isOverwrite.label")}
              </Form.Label>
              <div className="mt-2">
                <Form.Switch
                  {...register("isOverwrite")}
                  label={translate("modals.uploadConfirm.form.isOverwrite.hint")}
                />
              </div>
            </Form.Group>
            {
              !canAccelerateUploading
                ? null
                : <Form.Group as={Fragment} controlId="accelerateUploading">
                  <Form.Label className="text-end">
                    {translate("modals.uploadConfirm.form.accelerateUploading.label")}
                  </Form.Label>
                  <div className="mt-2">
                    <Form.Switch
                      {...register("accelerateUploading")}
                      label={translate("modals.uploadConfirm.form.accelerateUploading.hint")}
                    />
                    {
                    <Form.Text>
                      {translate("modals.uploadConfirm.form.accelerateUploading.hintSecondary")}
                    </Form.Text>
                    }
                  </div>
                </Form.Group>
            }
            {
              !memoStorageClasses.length
                ? null
                : <Form.Group as={Fragment} controlId="storageClassKodoName">
                  <Form.Label className="text-end">
                    {translate("modals.uploadConfirm.form.storageClassKodoName.label")}
                  </Form.Label>
                  <div className="mt-2">
                    {
                      memoStorageClasses.map(storageClass => (
                        <Form.Check
                          {...register("storageClassKodoName")}
                          id={`storageClassKodoName-${storageClass.kodoName}`}
                          key={storageClass.kodoName}
                          type="radio"
                          label={storageClass.nameI18n[currentLanguage]}
                          value={storageClass.kodoName}
                        />
                      ))
                    }
                    <Form.Text>
                      {
                        memoStorageClasses
                          .find(storageClasses =>
                            storageClasses.kodoName === watch("storageClassKodoName"))
                          ?.billingI18n[currentLanguage]
                      }
                    </Form.Text>
                  </div>
                </Form.Group>
            }
          </fieldset>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        {
          onClickRefreshCanAccelerateUploading &&
          <TipPopover
            className="me-auto"
            onClickRefresh={onClickRefreshCanAccelerateUploading}
          />
        }
        {
          !memoFilePaths.length
            ? null
            : <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit(handleSubmitUploadFiles)}
            >
              {
                isSubmitting
                  ? <>
                    <Spinner className="me-1" animation="border" size="sm"/>
                    {translate("common.submitting")}
                  </>
                  : translate("common.submit")
              }
            </Button>
        }
        <Button
          variant="light"
          size="sm"
          onClick={modalProps.onHide}
        >
          {translate("common.close")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UploadFilesConfirm;
