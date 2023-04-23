import React, {Fragment, useEffect} from "react";
import {Form} from "react-bootstrap";
import {SubmitHandler, UseFormReturn} from "react-hook-form";

import {useI18n} from "@renderer/modules/i18n";
import StorageClass from "@common/models/storage-class";

export interface ChangeStorageClassFormData {
  storageClassKodoName: string,
  someInput: string,
}

interface ChangeStorageClassFormProps {
  fileName?: string,
  formController: UseFormReturn<ChangeStorageClassFormData>
  storageClasses: StorageClass[],
  defaultStorageClassKodoName?: string,
  onSubmit: SubmitHandler<ChangeStorageClassFormData>,
}

const ChangeStorageClassForm: React.FC<ChangeStorageClassFormProps> = ({
  fileName,
  formController,
  storageClasses,
  defaultStorageClassKodoName,
  onSubmit,
}) => {
  const {currentLanguage, translate} = useI18n();

  const {
    handleSubmit,
    register,
    reset,
    watch,
    formState: {
      isSubmitting,
      isSubmitSuccessful,
    },
  } = formController;

  const availableStorageClasses = defaultStorageClassKodoName === undefined
    ? storageClasses
    : storageClasses.filter(storageClass => {
      return storageClass.kodoName !== defaultStorageClassKodoName;
    });

  const fileStorageClass = defaultStorageClassKodoName === undefined
    ? undefined
    : storageClasses.find(storageClass => {
      return storageClass.kodoName === defaultStorageClassKodoName
    });

  useEffect(() => {
    reset({
      storageClassKodoName: availableStorageClasses[0].kodoName,
    });
  }, []);

  return (
    <Form
      className="mx-5"
      onSubmit={handleSubmit(onSubmit)}
    >
      <fieldset
        className="grid-auto grid-form label-col-1"
        disabled={isSubmitting || isSubmitSuccessful}
      >
        {
          !fileName
            ? null
            : <Form.Group as={Fragment} controlId="fileName">
              <Form.Label className="text-end">
                {translate("forms.changeStorageClass.fileName.label")}
              </Form.Label>
              <div>
                <Form.Control
                  plaintext
                  readOnly
                  defaultValue={fileName}
                />
              </div>
            </Form.Group>
        }
        {
          !fileStorageClass
            ? null
            : <Form.Group as={Fragment} controlId="currentStorageClass">
              <Form.Label className="text-end">
                {translate("forms.changeStorageClass.currentStorageClass.label")}
              </Form.Label>
              <div>
                <Form.Control
                  plaintext
                  readOnly
                  defaultValue={fileStorageClass?.nameI18n[currentLanguage] ?? defaultStorageClassKodoName}
                />
              </div>
            </Form.Group>
        }
        <Form.Group as={Fragment} controlId="storageClassKodoName">
          <Form.Label className="text-end">
            {translate("forms.changeStorageClass.storageClassKodoName.label")}
          </Form.Label>
          <div>
            {
              availableStorageClasses.map(storageClass => (
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
                availableStorageClasses
                  .find(storageClasses =>
                    storageClasses.kodoName === watch("storageClassKodoName"))
                  ?.billingI18n[currentLanguage]
              }
            </Form.Text>
          </div>
        </Form.Group>
      </fieldset>
    </Form>
  );
};

export default ChangeStorageClassForm;
