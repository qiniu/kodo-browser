import React, {PropsWithChildren} from "react";
import {Button, Form, Spinner} from "react-bootstrap";
import {UseFormHandleSubmit} from "react-hook-form";

import {useI18n} from "@renderer/modules/i18n";

import {GenerateLinkFormData} from "./types";

interface GenerateLinkFormProps {
  onSubmit?: ReturnType<UseFormHandleSubmit<GenerateLinkFormData>>,
  onChange?: () => void,

  isValid?: boolean,
  isSubmitting?: boolean,

  // portal
  submitButtonPortal?: React.FC<PropsWithChildren>,
}

const GenerateLinkForm: React.FC<PropsWithChildren<GenerateLinkFormProps>> = ({
  onChange,
  onSubmit,

  isValid = true,
  isSubmitting = false,

  submitButtonPortal: SubmitButtonPortal,

  children,
}) => {
  const {translate} = useI18n();

  return (
    <>
      <Form
        className="mx-5"
        onSubmit={onSubmit}
        onChange={onChange}
      >
        <div
          className="grid-auto grid-form label-col-1"
        >
          <fieldset
            className="d-contents"
            disabled={isSubmitting}
          >
            {children}
          </fieldset>
        </div>
      </Form>
      {
        SubmitButtonPortal
          ? <SubmitButtonPortal>
            <Button
              variant="primary"
              size="sm"
              disabled={!isValid || isSubmitting}
              onClick={onSubmit}
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
          </SubmitButtonPortal>
          : null
      }
    </>
  );
};

export default GenerateLinkForm;
