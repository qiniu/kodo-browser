import path from "path";
import fs from "fs";
import {dialog as electronDialog, shell as electronShell} from '@electron/remote'

import React, {Fragment, useEffect, useMemo, useState} from "react";
import {Button, Form, InputGroup, Modal, ModalProps} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";
import classNames from "classnames";
import moment from "moment";
import csvStringify from "csv-stringify";

import StorageClass from "@common/models/storage-class";
import {BackendMode} from "@common/qiniu"

import usePortal from "@renderer/modules/hooks/use-portal";
import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {FileItem, signatureUrls} from "@renderer/modules/qiniu-client";
import {DomainAdapter, NON_OWNED_DOMAIN, useLoadDomains} from "@renderer/modules/qiniu-client-hooks";
import {useFileOperation} from "@renderer/modules/file-operation";

import {
  BatchProgress,
  BatchTaskStatus,
  ErroredFileOperation,
  ErrorFileList,
  useBatchProgress
} from "@renderer/components/batch-progress";

import {
  DEFAULT_EXPIRE_AFTER,
  GenerateLinkFormData,
  GenerateLinkForm,
  DomainNameField,
  ExpireAfterField,
} from "@renderer/components/forms/generate-link-form";
import FileList from "../common/file-list";

interface GenerateFileLinksProps {
  regionId: string,
  bucketName: string,
  basePath: string,
  fileItems: FileItem.Item[],
  storageClasses: StorageClass[],
  canS3Domain: boolean,
  defaultDomain?: DomainAdapter,
}

const GenerateFileLinks: React.FC<ModalProps & GenerateFileLinksProps> = (props) => {
  const {
    regionId,
    bucketName,
    basePath,
    fileItems,
    storageClasses,
    canS3Domain,
    defaultDomain,
    ...modalProps
  } = props;

  const {translate} = useI18n();
  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  // batch operation progress states
  const [batchProgressState, setBatchProgressState] = useBatchProgress();
  const [erroredFileOperations, setErroredFileOperations] = useState<ErroredFileOperation[]>([]);

  // cache operation states prevent props update after modal opened.
  const {
    memoFileItems,
    memoIsFiltered,
    memoRegionId,
    memoBucketName,
    memoBasePath,
    memoStorageClasses,
    memoCanS3Domain,
    memoDefaultDomain,
  } = useMemo(() => {
    const filteredItems = fileItems.filter(f => f.name?.length > 0);
    return {
      memoFileItems: modalProps.show ? filteredItems : [],
      memoIsFiltered: filteredItems.length !== fileItems.length,
      memoRegionId: regionId,
      memoBucketName: bucketName,
      memoBasePath: basePath,
      memoStorageClasses: storageClasses,
      memoCanS3Domain: canS3Domain,
      memoDefaultDomain: defaultDomain,
    };
  }, [modalProps.show]);

  // domains loader
  const {
    loadDomainsState: {
      loading: loadingDomains,
      domains,
    },
    loadDomains,
  } = useLoadDomains({
    user: currentUser,
    regionId: memoRegionId,
    bucketName: memoBucketName,
    canDefaultS3Domain: memoCanS3Domain,
    preferBackendMode,
  });

  // state when generate succeed
  const [csvFilePath, setCsvFilePath] = useState<string>("");
  const handleClickShowItemInDirectory = () => {
    if (!csvFilePath) {
      return;
    }
    electronShell.showItemInFolder(csvFilePath);
  };

  // form for generating file links
  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: {
      isValid,
      isSubmitting,
    },
  } = useForm<GenerateLinkFormData>({
    mode: "onChange",
  });

  const [domain] = watch(["domain"]);

  const dialogSavePath = () => {
    return electronDialog.showOpenDialog({
      title: translate("modals.generateFileLinks.selectLocalPathDialog.title"),
      properties: ["openDirectory"],
    });
  }

  const generateAndSaveFileLinks = (
    domain: DomainAdapter | undefined,
    expireAfter: number,
    targetDirectoryPath: string
  ): Promise<string> => {
    if (!currentUser) {
      return Promise.reject();
    }

    const fileName = `kodo-browser-download-links-${moment().utc().format('YYYYMMDDHHmmSS')}`;
    let filePath = path.join(targetDirectoryPath, `${fileName}.csv`);
    for (let i = 1; fs.existsSync(filePath); i++) {
      filePath = path.join(targetDirectoryPath, `${fileName}.${i}.csv`);
    }
    const csvFile = fs.createWriteStream(filePath);
    const csvStringifier = csvStringify();
    csvStringifier.pipe(csvFile);
    csvStringifier.write(['BucketName', 'ObjectName', 'URL']);

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
      storageClasses: memoStorageClasses,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter:
        preferBackendMode === BackendMode.S3 ||
        domain?.apiScope === BackendMode.S3,
    };
    return signatureUrls(
      memoRegionId,
      memoBucketName,
      memoFileItems,
      domain?.name === NON_OWNED_DOMAIN.name
        ? undefined
        : domain,
      expireAfter,
      (progress) => {
        setBatchProgressState({
          total: progress.total,
          finished: progress.current,
          errored: progress.errorCount,
        });
      },
      async (file, url) => {
        csvStringifier.write([file.bucket, file.path.toString(), url.toString()]);
      },
      () => {},
      opt,
    )
      .then(batchErrors => {
        setErroredFileOperations(batchErrors.map<ErroredFileOperation>(batchError => ({
          fileType: batchError.item.itemType,
          path: batchError.item.path.toString().slice(memoBasePath.length),
          errorMessage: batchError.error.translated_message ||
            batchError.error.message ||
            batchError.error.code,
        })));
        return filePath;
      })
      .finally(() => {
        setBatchProgressState({
          status: BatchTaskStatus.Ended,
        });
      });
  }

  const handleSubmitGenerateFileLinks: SubmitHandler<GenerateLinkFormData> = (data) => {
    if (!memoFileItems.length || !currentUser) {
      return;
    }

    const p = dialogSavePath()
      .then(({filePaths, canceled}) => {
        if (canceled || !filePaths?.length) {
          return Promise.reject(
            translate("modals.generateFileLinks.selectLocalPathDialog.error.cancelOrNoSelected")
          );
        }
        const targetDirectory = filePaths[0].replace(/(\/*$)/g, '');

        setBatchProgressState({
          status: BatchTaskStatus.Running,
        });

        return generateAndSaveFileLinks(
          data.domain,
          data.expireAfter,
          targetDirectory,
        );
      })
      .then(csvFilePath => {
        setCsvFilePath(csvFilePath);
      });

    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  };

  const {ref: submitButtonRef, portal: submitButtonPortal} = usePortal();

  // reset states when open/close modal.
  useEffect(() => {
    if (modalProps.show) {
      reset({
        domain: memoDefaultDomain ?? NON_OWNED_DOMAIN,
        expireAfter: DEFAULT_EXPIRE_AFTER,
      });
    } else {
      setCsvFilePath("");
      setBatchProgressState({
        status: BatchTaskStatus.Standby,
      });
      setErroredFileOperations([]);
    }
  }, [modalProps.show]);

  // render
  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-link-45deg me-1"/>
          {translate("modals.generateFileLinks.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        {
          memoIsFiltered &&
          <div className="text-bg-warning bg-opacity-25 px-3 py-1">
            {translate("modals.generateFileLinks.hintFiltered")}
          </div>
        }
        <div className="p-3">
          {
            !memoFileItems.length
              ? <div>
                {translate("common.noObjectSelected")}
              </div>
              : <>
                <FileList
                  className="scroll-max-vh-40"
                  data={memoFileItems}
                  prefixDescription={
                    <div className="text-danger">
                      {translate("modals.generateFileLinks.prefixDescription")}
                    </div>
                  }
                  description={
                    <div>
                      {translate("modals.generateFileLinks.description")}
                    </div>
                  }
                />
                <GenerateLinkForm
                  onSubmit={handleSubmit(handleSubmitGenerateFileLinks)}
                  isValid={isValid}
                  isSubmitting={isSubmitting}
                  submitButtonPortal={submitButtonPortal}
                >
                  <DomainNameField
                    control={control}
                    defaultDomain={memoDefaultDomain}
                    domains={domains}
                    loadingDomains={loadingDomains}
                    onReloadDomains={loadDomains}
                  />
                  {
                    (domain?.private || domain?.protected) &&
                    <ExpireAfterField
                      control={control}
                      maxValue={domain.linkMaxLifetime}
                    />
                  }
                  <Form.Group as={Fragment} controlId="csvFile">
                    <Form.Label
                      className={classNames(
                        "text-end",
                        {
                          "invisible-no-h": !csvFilePath
                        }
                      )}
                    >
                      {translate("modals.generateFileLinks.csvFile.label")}
                    </Form.Label>
                    <div
                      className={classNames({
                        "invisible-no-h": !csvFilePath
                      })}
                    >
                      <InputGroup>
                        <Form.Control
                          type="text"
                          value={csvFilePath}
                          readOnly
                        />
                        <Button
                          variant="info"
                          onClick={handleClickShowItemInDirectory}
                        >
                        <span className="text-white">
                          {translate("modals.generateFileLinks.csvFile.suffix")}
                        </span>
                        </Button>
                      </InputGroup>
                    </div>
                  </Form.Group>
                </GenerateLinkForm>
                {
                  batchProgressState.status === BatchTaskStatus.Standby ||
                  batchProgressState.status === BatchTaskStatus.Ended
                    ? null
                    : <BatchProgress
                      status={batchProgressState.status}
                      total={batchProgressState.total}
                      finished={batchProgressState.finished}
                      errored={batchProgressState.errored}
                    />
                }
                {
                  !erroredFileOperations.length
                    ? null
                    : <ErrorFileList
                      data={erroredFileOperations}
                    />
                }
              </>
          }
        </div>
      </Modal.Body>
      <Modal.Footer>
        {
          !memoFileItems.length ||
          batchProgressState.status === BatchTaskStatus.Ended
            ? null
            : <span ref={submitButtonRef}/>
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

export default GenerateFileLinks;
