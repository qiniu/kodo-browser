import React, {ChangeEventHandler, FocusEventHandler} from "react";
import {Form} from "react-bootstrap"

import {useI18n} from "@renderer/modules/i18n";
import {DomainAdapter, NON_OWNED_DOMAIN} from "@renderer/modules/qiniu-client-hooks";

import {FormSelectProps} from "@renderer/components/forms/types";

interface DomainNameSelectProps extends FormSelectProps<DomainAdapter> {
}

const DomainNameSelect: React.ForwardRefRenderFunction<unknown, DomainNameSelectProps> = ({
  value,
  options,
  isInvalid,
  onChange,
  onBlur,
  name,
  required,
  disabled,
}, _ref) => {
  const {translate} = useI18n();

  const handleChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    const domainName = event.target.value;
    const domainAdapter = options.find(d => d.name === domainName);
    onChange(domainAdapter);
  };

  const handleBlur: FocusEventHandler<HTMLSelectElement> = (event) => {
    const domainName = event.target.value;
    const domainAdapter = options.find(d => d.name === domainName);
    onBlur(domainAdapter);
  }

  return (
    <Form.Select
      name={name}
      value={value?.name}
      isInvalid={isInvalid}
      required={required}
      disabled={disabled}
      onChange={handleChange}
      onBlur={handleBlur}
    >
      {
        options.map(domainAdapter => (
          <option
            key={domainAdapter.name}
            value={domainAdapter.name}
          >
            {
              domainAdapter.name === NON_OWNED_DOMAIN.name
                ? translate("forms.generateLink.domainName.nonOwnedDomain")
                : domainAdapter.name
            }
          </option>
        ))
      }
    </Form.Select>
  )
};

export default React.forwardRef(DomainNameSelect);
