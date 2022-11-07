import React, {useEffect, useMemo} from "react";
import {Form, Modal, ModalProps} from "react-bootstrap";
import {FormProvider, useForm} from "react-hook-form";
import {toast} from "react-hot-toast";

import {LangName, useI18n} from "@renderer/modules/i18n";
import Settings from "@renderer/modules/settings";

import {SettingsFormData} from "./types";
import FieldsUpload from "./fields-upload";
import FieldsDownload from "./fields-download";
import FieldsExternalPath from "./fields-external-path";
import FieldsOthers from "./fields-others";

import "./settings.scss";

const formKey2SettingsKey: Record<keyof SettingsFormData, keyof typeof Settings> = {
  enabledResumeUpload: "resumeUpload",
  multipartUploadThreshold: "multipartUploadThreshold",
  multipartUploadPartSize: "multipartUploadSize",
  maxUploadConcurrency: "maxUploadConcurrency",
  enabledUploadSpeedLimit: "uploadSpeedLimitEnabled",
  uploadSpeedLimit: "uploadSpeedLimitKbPerSec",

  enabledResumeDownload: "resumeDownload",
  multipartDownloadThreshold: "multipartDownloadThreshold",
  multipartDownloadPartSize: "multipartDownloadSize",
  maxDownloadConcurrency: "maxDownloadConcurrency",
  enabledDownloadSpeedLimit: "downloadSpeedLimitEnabled",
  downloadSpeedLimit: "downloadSpeedLimitKbPerSec",

  enabledExternalPath: "externalPathEnabled",

  enabledDebugLog: "isDebug",
  enabledLoadFilesOnTouchEnd: "stepByStepLoadingFiles",
  loadFilesNumberPerPage: "filesLoadingSize",
  enabledAutoUpdateApp: "autoUpgrade",
  language: "language",
}

const SettingsModal: React.FC<ModalProps> = (modalProps) => {
  const {currentLanguage, translate, setLanguage} = useI18n();

  const defaultValues: SettingsFormData = useMemo(() => ({
    enabledResumeUpload: Boolean(Settings.resumeUpload),
    multipartUploadThreshold: Settings.multipartUploadThreshold,
    multipartUploadPartSize: Settings.multipartUploadSize,
    maxUploadConcurrency: Settings.maxUploadConcurrency,
    enabledUploadSpeedLimit: Boolean(Settings.uploadSpeedLimitEnabled),
    uploadSpeedLimit: Settings.uploadSpeedLimitKbPerSec,

    enabledResumeDownload: Boolean(Settings.resumeDownload),
    multipartDownloadThreshold: Settings.multipartDownloadThreshold,
    multipartDownloadPartSize: Settings.multipartDownloadSize,
    maxDownloadConcurrency: Settings.maxDownloadConcurrency,
    enabledDownloadSpeedLimit: Boolean(Settings.downloadSpeedLimitEnabled),
    downloadSpeedLimit: Settings.downloadSpeedLimitKbPerSec,

    enabledExternalPath: Boolean(Settings.externalPathEnabled),

    enabledDebugLog: Boolean(Settings.isDebug),
    enabledLoadFilesOnTouchEnd: Boolean(Settings.stepByStepLoadingFiles),
    loadFilesNumberPerPage: Settings.filesLoadingSize,
    enabledAutoUpdateApp: Boolean(Settings.autoUpgrade),
    language: currentLanguage,
  }), []);

  const settingsFormController = useForm<SettingsFormData>({
    mode: "onChange",
    shouldFocusError: false,
    defaultValues: defaultValues,
  });

  useEffect(() => {
    settingsFormController.trigger();
  }, [modalProps.show]);

  const handleChangeForm = useMemo(() => {
    const timers: Record<string, number> = {}
    return (event: {target: any}) => {
      const fieldName: keyof SettingsFormData = event.target.name;

      clearTimeout(timers[fieldName]);

      timers[fieldName] = setTimeout(() => {
        if (settingsFormController.getFieldState(fieldName).error) {
          return;
        }
        const fieldValue = settingsFormController.getValues(fieldName);
        const settingKey = formKey2SettingsKey[fieldName];
        // can't map field value to correct type of setting keys
        // @ts-ignore
        Settings[settingKey] = typeof fieldValue === "boolean"
          ? fieldValue ? 1 : 0
          : fieldValue;

        if (fieldName === "language") {
          setLanguage(fieldValue as LangName);
        }
        toast.success(translate("modals.settings.saved"));
      }, 300) as unknown as number;
    }
  }, []);

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-gear-fill me-1"/>
          {translate("modals.settings.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Form Provider lost type infos */}
        <FormProvider {...settingsFormController}>
          <Form
            className="settings-form scroll-max-vh-60"
            onChange={handleChangeForm}
          >
            <FieldsUpload/>
            <FieldsDownload/>
            <FieldsExternalPath/>
            <FieldsOthers/>
          </Form>
        </FormProvider>
      </Modal.Body>
    </Modal>
  );
};

export default SettingsModal;
