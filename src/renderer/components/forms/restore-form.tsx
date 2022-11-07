import React from "react";
import {Col, Form, Row} from "react-bootstrap";
import {SubmitHandler, UseFormReturn} from "react-hook-form";

import {useI18n} from "@renderer/modules/i18n";
import {FrozenInfo} from "@renderer/modules/qiniu-client-hooks/use-frozen-info";

export interface RestoreFormData {
  days: number,
}

interface _RestoreFormProps {
  fileName?: string,
  formController: UseFormReturn<RestoreFormData>,
  onSubmit: SubmitHandler<RestoreFormData>,
}

const _RestoreForm: React.FC<_RestoreFormProps> = ({
  fileName,
  formController,
  onSubmit,
}) => {
  const {translate} = useI18n();

  // form to restore
  const {
    handleSubmit,
    register,
    formState: {
      isSubmitting,
      isSubmitSuccessful,
    },
  } = formController;

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
                {translate("forms.restore.fileName.label")}
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
        <Form.Group as={Row} className="mb-3" controlId="days">
          <Form.Label className="text-end" column sm={4}>
            {translate("forms.restore.days.label")}
          </Form.Label>
          <Col sm={7}>
            <Form.Select
              {...register("days")}
              autoFocus
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
              <option value={6}>6</option>
              <option value={7}>7</option>
            </Form.Select>
          </Col>
        </Form.Group>
      </fieldset>
    </Form>
  );
}

interface RestoreFormProps extends _RestoreFormProps {
  frozenInfo?: FrozenInfo,
}

const RestoreForm: React.FC<RestoreFormProps> = ({
  fileName,
  frozenInfo,
  formController,
  onSubmit,
}) => {
  const {translate} = useI18n();

  // render
  if (!frozenInfo) {
    return (
      <_RestoreForm
        fileName={fileName}
        formController={formController}
        onSubmit={onSubmit}
      />
    );
  }

  if (frozenInfo.isLoading) {
    return (
      <div>
        {translate("forms.restore.frozen.loading")}
      </div>
    );
  }

  switch (frozenInfo.status) {
    case "Normal":
      return (
        <div>
          {translate("forms.restore.frozen.normal")}
        </div>
      );
    case "Unfreezing":
      return (
        <div>
          {translate("forms.restore.frozen.unfreezing")}
        </div>
      );
    case "Unfrozen":
      return (
        <div>
          {translate("forms.restore.frozen.unfrozen")}
        </div>
      );
    case "Frozen":
      return (
        <_RestoreForm
          fileName={fileName}
          formController={formController}
          onSubmit={onSubmit}
        />
      );
  }

  return (
    <div>
      {translate("forms.restore.frozen.unknown")} <code>{frozenInfo.status}</code>
    </div>
  );
};

export default RestoreForm;
