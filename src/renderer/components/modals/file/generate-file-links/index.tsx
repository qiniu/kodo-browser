import path from "path";
import fs from "fs";
import {dialog as electronDialog, shell as electronShell} from '@electron/remote'

import React, {useEffect, useMemo, useState} from "react";
import {Button, Col, Form, InputGroup, Modal, ModalProps, Row} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";
import moment from "moment";
import csvStringify from "csv-stringify";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import StorageClass from "@common/models/storage-class";

import usePortal from "@renderer/modules/hooks/use-portal";
import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {FileItem, signatureUrls} from "@renderer/modules/qiniu-client";
import {useLoadDomains} from "@renderer/modules/qiniu-client-hooks";
import {isItemFolder} from "@renderer/modules/qiniu-client/file-item";

import {
  BatchProgress,
  BatchTaskStatus,
  ErroredFileOperation, ErrorFileList,
  useBatchProgress
} from "@renderer/components/batch-progress";

import {
  GenerateLinkForm,
  GenerateLinkFormData,
  GenerateLinkSubmitData,
  NON_OWNED_DOMAIN
} from "@renderer/components/forms";

interface GenerateFileLinksProps {
  regionId: string,
  bucketName: string,
  basePath: string,
  fileItems: FileItem.Item[],
  storageClasses: StorageClass[],
  defaultDomain?: Domain,
}

const GenerateFileLinks: React.FC<ModalProps & GenerateFileLinksProps> = (props) => {
  const {
    regionId,
    bucketName,
    basePath,
    fileItems,
    storageClasses,
    defaultDomain,
    ...modalProps
  } = props;

  const {translate} = useI18n();
  const {currentUser} = useAuth();

  // batch operation progress states
  const [batchProgressState, setBatchProgressState] = useBatchProgress();
  const [erroredFileOperations, setErroredFileOperations] = useState<ErroredFileOperation[]>([]);

  // cache operation states prevent props update after modal opened.
  const {
    memoFileItems,
    memoRegionId,
    memoBucketName,
    memoBasePath,
    memoStorageClasses,
    memoDefaultDomain,
  } = useMemo(() => ({
    memoFileItems: modalProps.show ? fileItems : [],
    memoRegionId: regionId,
    memoBucketName: bucketName,
    memoBasePath: basePath,
    memoStorageClasses: storageClasses,
    memoDefaultDomain: defaultDomain,
  }), [modalProps.show]);

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
  });

  // state when generate succeed
  const [csvFilePath, setCsvFilePath] = useState<string | null>(null);
  const handleClickShowItemInDirectory = () => {
    if (!csvFilePath) {
      return;
    }
    electronShell.showItemInFolder(csvFilePath);
  };

  // form for generating file links
  const generateLinkFormController = useForm<GenerateLinkFormData>({
    mode: "onChange",
    defaultValues: {
      domainName: memoDefaultDomain?.name ?? NON_OWNED_DOMAIN,
      expireAfter: 600,
    }
  });

  const {reset} = generateLinkFormController;

  const dialogSavePath = () => {
    return electronDialog.showOpenDialog({
      title: translate("modals.generateFileLinks.selectLocalPathDialog.title"),
      properties: ["openDirectory"],
    });
  }

  const generateAndSaveFileLinks = (domain: Domain | undefined, expireAfter: number, targetDirectoryPath: string): Promise<string> => {
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
      preferS3Adapter: !domain,
    };
    return signatureUrls(
      memoRegionId,
      memoBucketName,
      memoFileItems,
      domain,
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
          errorMessage: batchError.error.translated_message
            || batchError.error.message
            || batchError.error.code,
        })));
        return filePath;
      })
      .finally(() => {
        setBatchProgressState({
          status: BatchTaskStatus.Ended,
        });
      });
  }

  const handleSubmitGenerateFileLinks: SubmitHandler<GenerateLinkSubmitData> = (data) => {
    if (!memoFileItems.length || !currentUser) {
      return;
    }

    const p = dialogSavePath()
      .then(({filePaths, canceled}) => {
        if (canceled || !filePaths?.length) {
          return Promise.reject();
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
      error: translate("common.failed"),
    });
  };

  const {ref: submitButtonRef, portal: submitButtonPortal} = usePortal();

  // reset states when open/close modal.
  useEffect(() => {
    if (modalProps.show) {
      reset({
        domainName: memoDefaultDomain?.name ?? NON_OWNED_DOMAIN,
      });
    } else {
      setCsvFilePath(null);
      setBatchProgressState({
        status: BatchTaskStatus.Standby,
      });
      setErroredFileOperations([]);
    }
  }, [modalProps.show]);

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-link-45deg me-1"/>
          {translate("modals.generateFileLinks.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {
          !memoFileItems.length
            ? <div>
              {translate("common.noOperationalObject")}
            </div>
            : <>
              <div className="text-danger">
                {translate("modals.generateFileLinks.description")}
              </div>
              <ul className="scroll-max-vh-40">
                {
                  memoFileItems.map(fileItem => (
                    <li key={fileItem.path.toString()}>
                      {
                        isItemFolder(fileItem)
                          ? <i className="bi bi-folder-fill me-1 text-yellow"/>
                          : <i className="fa fa-file-o me-1"/>
                      }
                      {fileItem.name}
                    </li>
                  ))
                }
              </ul>
              <GenerateLinkForm
                formController={generateLinkFormController}
                loadingDomains={loadingDomains}
                domains={domains}
                defaultDomain={memoDefaultDomain}
                onReloadDomains={loadDomains}
                onSubmit={handleSubmitGenerateFileLinks}
                submitButtonPortal={submitButtonPortal}
              />
              {
                !csvFilePath
                  ? null
                  : <Form.Group as={Row} className="mb-3" controlId="csvFile">
                    <Form.Label className="text-end" column sm={4}>
                      {translate("modals.generateFileLinks.csvFile.label")}
                    </Form.Label>
                    <Col sm={7}>
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
                    </Col>
                  </Form.Group>
              }
              {
                batchProgressState.status === BatchTaskStatus.Standby
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
      </Modal.Body>
      <Modal.Footer>
        {
          !memoFileItems.length || batchProgressState.status === BatchTaskStatus.Ended
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
