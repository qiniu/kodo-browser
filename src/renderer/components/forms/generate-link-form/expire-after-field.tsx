import React, {Fragment} from "react";
import {Control, useController} from "react-hook-form";
import {Form, InputGroup} from "react-bootstrap";

import Duration from "@common/const/duration";
import {Translate, useI18n} from "@renderer/modules/i18n";

import {GenerateLinkFormData} from "./types";

export const DEFAULT_EXPIRE_AFTER = 600;

interface ExpireAfterFieldProps {
  control: Control<GenerateLinkFormData>,
  maxValue: number,
}

const ExpireAfterField: React.FC<ExpireAfterFieldProps> = ({
  control,
  maxValue,
}) => {
  const {translate} = useI18n();

  const {field, fieldState} = useController({
    control,
    name: "expireAfter",
    defaultValue: DEFAULT_EXPIRE_AFTER,
    rules: {
      required: true,
      min: 1,
      max: maxValue / Duration.Second,
    },
  });

  return (
    <Form.Group as={Fragment} controlId="expireAfter">
      <Form.Label className="text-end">
        {translate("forms.generateLink.expireAfter.label")}
      </Form.Label>
      <div>
        <InputGroup>
          <Form.Control
            {...field}
            onChange={e => field.onChange(+e.target.value)}
            type="number"
            isInvalid={Boolean(fieldState.error)}
          />
          <InputGroup.Text>
            {translate("forms.generateLink.expireAfter.suffix")}
          </InputGroup.Text>
        </InputGroup>
        <Form.Text
          className={
            Boolean(fieldState.error)
              ? "text-danger"
              : ""
          }
        >
          <Translate
            i18nKey="forms.generateLink.expireAfter.hint"
            data={{
              min: "1",
              max: (maxValue / Duration.Second).toString(),
            }}
          />
        </Form.Text>
      </div>
    </Form.Group>
  );
};

export default ExpireAfterField;
