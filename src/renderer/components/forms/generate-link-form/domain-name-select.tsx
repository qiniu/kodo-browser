import React, {ChangeEventHandler, FocusEventHandler} from "react";
import {Form, FormSelectProps as BSFormSelectProps} from "react-bootstrap"
import lodash from "lodash";

import {useI18n} from "@renderer/modules/i18n";
import {DomainAdapter, NON_OWNED_DOMAIN} from "@renderer/modules/qiniu-client-hooks";

import {FormSelectProps} from "@renderer/components/forms/types";

interface DomainNameSelectProps extends FormSelectProps<DomainAdapter> {
  size?: BSFormSelectProps["size"],
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

  size,
}, _ref) => {
  const {translate} = useI18n();

  const handleChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    if (!onChange) {
      return;
    }
    const domainName = event.target.value;
    const domainAdapter = options.find(d => d.name === domainName);
    onChange(domainAdapter);
  };

  const handleBlur: FocusEventHandler<HTMLSelectElement> = (event) => {
    if (!onBlur) {
      return;
    }
    const domainName = event.target.value;
    const domainAdapter = options.find(d => d.name === domainName);
    onBlur(domainAdapter);
  };

  const groupedDomains = lodash.groupBy(options, 'type');
  const groupedDomainsOrder = ['cdn', 'origin'] as const;

  return (
    <Form.Select
      name={name}
      size={size}
      value={value?.name}
      isInvalid={isInvalid}
      required={required}
      disabled={disabled}
      onChange={handleChange}
      onBlur={handleBlur}
    >
      {
        !Array.isArray(groupedDomains['others'])
          ? null
          : groupedDomains['others'].map(domainAdapter => (
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
      {
        groupedDomainsOrder.map(domainType => {
          if (!Array.isArray(groupedDomains[domainType])) {
            return null;
          }
          return (
            <optgroup
              key={domainType}
              label={translate(`forms.generateLink.domainType.${domainType}`)}
            >
              {
                groupedDomains[domainType].map(domainAdapter => (
                  <option
                    key={domainAdapter.name}
                    value={domainAdapter.name}
                  >
                    {domainAdapter.name}
                  </option>
                ))
              }
            </optgroup>
          );
        })
      }
    </Form.Select>
  )
};

export default React.forwardRef(DomainNameSelect);
