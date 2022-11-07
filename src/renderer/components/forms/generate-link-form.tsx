import {clipboard} from "electron";

import React, {PropsWithChildren, useMemo} from "react";
import classNames from "classnames";
import {toast} from "react-hot-toast";
import {Button, Col, Form, InputGroup, Row, Spinner} from "react-bootstrap";
import {SubmitHandler, UseFormReturn} from "react-hook-form";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import {useI18n} from "@renderer/modules/i18n";

// utils
export const NON_OWNED_DOMAIN = "non-owned-domain";

export const getSelectedDomain = (
  domainList: Domain[],
  domainName: string,
  defaultDomain?: Domain,
): Domain | undefined => {
  if (domainName === defaultDomain?.name) {
    return defaultDomain;
  }
  return domainList.find(d => d.name === domainName);
}

// form data interface
export interface GenerateLinkFormData {
  domainName: string,
  expireAfter: number, // seconds
}

export interface GenerateLinkSubmitData extends GenerateLinkFormData {
  domain: Domain | undefined,
}

// component
interface GenerateLinkFormProps {
  fileName?: string,
  fileLink?: string,
  formController: UseFormReturn<GenerateLinkFormData>
  loadingDomains?: boolean,
  domains: Domain[],
  defaultDomain?: Domain,
  onReloadDomains?: () => void,
  onSubmit: SubmitHandler<GenerateLinkSubmitData>,

  // portal
  submitButtonPortal?: React.FC<PropsWithChildren>,
}

const GenerateLinkForm: React.FC<GenerateLinkFormProps> = ({
  fileName,
  fileLink,
  formController,
  loadingDomains,
  domains,
  defaultDomain,
  onReloadDomains,
  onSubmit,

  submitButtonPortal: SubmitButtonPortal,
}) => {
  const {translate} = useI18n();

  const memoDefaultDomain = useMemo(() => defaultDomain, []);

  // form for generating link
  const {
    handleSubmit,
    register,
    watch,
    formState: {
      isSubmitting,
      isSubmitSuccessful,
    },
  } = formController;

  const handleSubmitGenerateFileLink: SubmitHandler<GenerateLinkFormData> =
    (data, event) =>
      onSubmit({
        ...data,
        domain: getSelectedDomain(domains, data.domainName, memoDefaultDomain),
      }, event);

  const handleCopyFileLink = () => {
    if (!fileLink) {
      return;
    }
    clipboard.writeText(fileLink);
    toast.success(translate("forms.generateLink.fileLink.copied"));
  };


  // some calculate state
  const selectedDomain = getSelectedDomain(domains, watch("domainName"), memoDefaultDomain);

  // render
  return (
    <>
      <Form onSubmit={handleSubmit(handleSubmitGenerateFileLink)}>
        <fieldset
          disabled={isSubmitting || isSubmitSuccessful}
        >
          {
            !fileName
              ? null
              : <Form.Group as={Row} className="mb-3" controlId="fileName">
                <Form.Label className="text-end" column sm={4}>
                  {translate("forms.generateLink.fileName.label")}
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
          <Form.Group as={Row} className="mb-3" controlId="domainName">
            <Form.Label className="text-end" column sm={4}>
              {translate("forms.generateLink.domainName.label")}
            </Form.Label>
            <Col sm={7}>
              <InputGroup>
                <Form.Select
                  {...register("domainName")}
                >
                  <option value={NON_OWNED_DOMAIN}>
                    {translate("forms.generateLink.domainName.nonOwnedDomain")}
                  </option>
                  {
                    memoDefaultDomain
                      ? <option value={memoDefaultDomain.name}>{memoDefaultDomain.name}</option>
                      : null
                  }
                  {
                    domains
                      .filter(domain => domain.name !== memoDefaultDomain?.name)
                      .map(domain => (
                        <option key={domain.name} value={domain.name}>{domain.name}</option>
                      ))
                  }
                </Form.Select>
                {
                  onReloadDomains &&
                  <Button
                    variant="outline-solid-gray-400"
                    onClick={onReloadDomains}
                  >
                    <i
                      className={classNames(
                        "bi bi-arrow-repeat",
                        {
                          "loading-spin": loadingDomains,
                        },
                      )}
                    />
                  </Button>
                }
              </InputGroup>
            </Col>
          </Form.Group>
          {
            selectedDomain?.private ?? true
              ? <Form.Group as={Row} className="mb-3" controlId="expireAfter">
                <Form.Label className="text-end" column sm={4}>
                  {translate("forms.generateLink.expireAfter.label")}
                </Form.Label>
                <Col sm={7}>
                  <InputGroup>
                    <Form.Control
                      {...register("expireAfter")}
                      type="number"
                    />
                    <InputGroup.Text>
                      {translate("forms.generateLink.expireAfter.suffix")}
                    </InputGroup.Text>
                  </InputGroup>
                </Col>
              </Form.Group>
              : null
          }
        </fieldset>
        {
          !fileLink
            ? null
            : <Form.Group as={Row} className="mb-3" controlId="fileLink">
              <Form.Label className="text-end" column sm={4}>
                {translate("forms.generateLink.fileLink.label")}
              </Form.Label>
              <Col sm={7}>
                <InputGroup>
                  <Form.Control
                    type="text"
                    value={fileLink}
                    readOnly
                  />
                  <Button
                    variant="info"
                    onClick={handleCopyFileLink}
                  >
                    <i className="fa fa-clone text-white"/>
                  </Button>
                </InputGroup>
              </Col>
            </Form.Group>
        }
      </Form>
      {
        SubmitButtonPortal && !isSubmitSuccessful
          ? <SubmitButtonPortal>
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit(handleSubmitGenerateFileLink)}
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
