import React, {Fragment, useMemo} from "react";
import {Control, useController} from "react-hook-form";
import classNames from "classnames";
import {Button, Form, InputGroup} from "react-bootstrap";

import {DomainAdapter} from "@renderer/modules/qiniu-client-hooks";

import {GenerateLinkFormData} from "./types";
import DomainNameSelect from "./domain-name-select";
import {useI18n} from "@renderer/modules/i18n";
import {BackendMode} from "@common/qiniu";

interface DomainNameFieldProps {
  control: Control<GenerateLinkFormData>

  isEmptyPath?: boolean,
  defaultDomain?: DomainAdapter,
  domains: DomainAdapter[],
  loadingDomains: boolean,
  onReloadDomains: () => void,
}

const DomainNameField: React.FC<DomainNameFieldProps> = ({
  control,
  isEmptyPath,
  defaultDomain,
  domains,
  loadingDomains,
  onReloadDomains,
}) => {
  const {translate} = useI18n();

  const validateDomain = (domainAdapter?: DomainAdapter) => {
    if (isEmptyPath && domainAdapter?.backendMode === BackendMode.S3) {
      return translate("forms.generateLink.domainName.feedback.emptyFileNameByS3Hint");
    }
    return true;
  };

  const {field, fieldState} = useController({
    control,
    name: "domain",
    rules: {
      required: true,
      validate: validateDomain,
    },
  });

  const options = useMemo(
    () => {
      if (!defaultDomain) {
        return domains;
      }
      return [
        defaultDomain,
        ...domains.filter(d => d.name !== defaultDomain?.name),
      ]
    },
  [defaultDomain, domains]);

  return (
    <Form.Group as={Fragment} controlId="domainName">
      <Form.Label className="text-end">
        {translate("forms.generateLink.domainName.label")}
      </Form.Label>
      <div>
        <InputGroup hasValidation>
          <DomainNameSelect
            {...field}
            options={options}
            isInvalid={Boolean(fieldState.error)}
          />
          {
            onReloadDomains &&
            <Button
              variant="outline-solid-gray-400"
              onClick={onReloadDomains}
            >
              <i
                className={classNames(
                  "bi bi-arrow-repeat d-inline-block",
                  {
                    "loading-spin": loadingDomains,
                  },
                )}
              />
            </Button>
          }
          <Form.Control.Feedback type="invalid">
            {fieldState.error?.message}
          </Form.Control.Feedback>
        </InputGroup>
      </div>
    </Form.Group>
  );
};

export default DomainNameField;
