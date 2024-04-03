import React, {useCallback, useEffect, useMemo, useSyncExternalStore} from "react";
import {Form, Modal, ModalProps} from "react-bootstrap";
import {FormProvider, SubmitHandler, useForm} from "react-hook-form";
import {toast} from "react-hot-toast";
import lodash from "lodash";

import * as Logger from "@renderer/modules/local-logger";
import {useI18n} from "@renderer/modules/i18n";
import {appPreferences, AppPreferencesData} from "@renderer/modules/user-config-store";

import FieldsUpload from "./fields-upload";
import FieldsDownload from "./fields-download";
import FieldsExternalPath from "./fields-external-path";
import FieldsOthers from "./fields-others";

import "./settings.scss";
import LoadingHolder from "@renderer/components/loading-holder";

const SettingsModal: React.FC<ModalProps> = (modalProps) => {
  const {currentLanguage, translate, setLanguage} = useI18n();

  const {
    state: appPreferencesState,
    data: appPreferencesData,
  } = useSyncExternalStore(
    appPreferences.store.subscribe,
    appPreferences.store.getSnapshot,
  );

  const defaultValues: AppPreferencesData = useMemo(() => ({
    ...appPreferencesData,
  }), [appPreferencesState.initialized]);

  const settingsFormController = useForm<AppPreferencesData>({
    mode: "onChange",
    shouldFocusError: false,
    defaultValues: defaultValues,
  });

  const {
    handleSubmit,
    reset,
    trigger,
  } = settingsFormController;

  useEffect(() => {
    if (modalProps.show && appPreferencesState.initialized) {
      reset({
        ...appPreferencesData,
      });
      trigger();
    }
  }, [modalProps.show, appPreferencesState.initialized, appPreferencesState.changedPersistenceValue]);

  const handleSaveSettings: SubmitHandler<AppPreferencesData> = async (data) => {
    try {
      if (data.language !== currentLanguage) {
        await setLanguage(data.language);
      }
      Logger.setLevel(data.logLevel);
      await appPreferences.setAll(data);
      toast.success(translate("modals.settings.saved"));
    } catch (err: any) {
      toast.error(err.toString());
    }
  };

  const handleSavaSettingsDebounced = useCallback(lodash.debounce(() => {
    handleSubmit(handleSaveSettings)();
  }, 300), [handleSubmit]);

  // render
  const renderForm = () => {
    if (!appPreferencesState.initialized) {
      return (
        <LoadingHolder/>
      );
    }
    return (
      // Form Provider lost type infos
      <FormProvider {...settingsFormController}>
        <Form
          className="settings-form scroll-max-vh-60"
          onChange={handleSavaSettingsDebounced}
        >
          <FieldsUpload/>
          <FieldsDownload/>
          <FieldsExternalPath/>
          <FieldsOthers/>
        </Form>
      </FormProvider>
    );
  };

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-gear-fill me-1"/>
          {translate("modals.settings.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {renderForm()}
      </Modal.Body>
    </Modal>
  );
};

export default SettingsModal;
