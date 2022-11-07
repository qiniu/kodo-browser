import React, {useEffect} from "react";
import {Col, Form, Row} from "react-bootstrap";
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
    <Form onSubmit={handleSubmit(onSubmit)}>
      <fieldset
        disabled={isSubmitting || isSubmitSuccessful}
      >
        {
          !fileName
            ? null
            : <Form.Group as={Row} className="mb-3" controlId="fileName">
              <Form.Label className="text-end" column sm={4}>
                {translate("forms.changeStorageClass.fileName.label")}
              </Form.Label>
              <Col sm={7}>
                <Form.Control
                  plaintext
                  readOnly
                  defaultValue={fileName}
                />
              </Col>
            </Form.Group>
        }
        {
          !fileStorageClass
            ? null
            : <Form.Group as={Row} className="mb-3" controlId="currentStorageClass">
              <Form.Label className="text-end" column sm={4}>
                {translate("forms.changeStorageClass.currentStorageClass.label")}
              </Form.Label>
              <Col sm={7}>
                <Form.Control
                  plaintext
                  readOnly
                  defaultValue={fileStorageClass?.nameI18n[currentLanguage] ?? defaultStorageClassKodoName}
                />
              </Col>
            </Form.Group>
        }
        <Form.Group as={Row} className="mb-3" controlId="storageClassKodoName">
          <Form.Label className="text-end" column sm={4}>
            {translate("forms.changeStorageClass.storageClassKodoName.label")}
          </Form.Label>
          <Col className="mt-2" sm={7}>
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
          </Col>
        </Form.Group>
      </fieldset>
    </Form>
  );
};

export default ChangeStorageClassForm;
