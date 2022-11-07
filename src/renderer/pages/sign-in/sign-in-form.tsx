import React, {useEffect} from "react";
import {Button, Col, Form, Row, Spinner} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";
import {useNavigate} from "react-router-dom";

import * as LocalLogger from "@renderer/modules/local-logger";
import {useI18n} from "@renderer/modules/i18n";
import {AkItem, EndpointType, useAuth} from "@renderer/modules/auth";
import RoutePath from "@renderer/pages/route-path";

import "./sign-in-form.scss";

export interface SignInFormValues extends AkItem {
  rememberMe: boolean,
}

interface SignInFormProps {
  defaultValues?: SignInFormValues,
  onClickPrivateEndpointSetting: () => void,
  onClickAccessKeyHistory: () => void,
}

const SignInForm: React.FC<SignInFormProps> = (props) => {
  const {translate} = useI18n();
  const {signIn} = useAuth();
  const navigate = useNavigate();

  const handleSignIn: SubmitHandler<SignInFormValues> = (data) => {
    LocalLogger.info("logging in data", data);
    const p = signIn(data, data.rememberMe);
    p.then(() => {
      navigate(RoutePath.Browse);
    });
    return toast.promise(p, {
      loading: translate("signIn.form.submit"),
      success: translate("common.success"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  };

  const {
    watch,
    register,
    handleSubmit,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<SignInFormValues>({
    mode: "onBlur",
    defaultValues: props.defaultValues,
  });

  useEffect(() => {
    reset(props.defaultValues);
  }, [props.defaultValues]);

  return (
    <Form className="sign-in-form" onSubmit={handleSubmit(handleSignIn)}>
      <fieldset disabled={isSubmitting}>
        <Form.Group as={Row} className="mb-3" controlId="endpointType">
          <Form.Label className="text-end" column sm={4}>
            <span className="text-danger">*</span>{translate("signIn.form.endpoint.label")}
          </Form.Label>
          <Col sm={7}>
            <Form.Select
              {...register("endpointType")}
              isInvalid={Boolean(errors.endpointType)}
            >
              <option value={EndpointType.Public}>{translate("signIn.form.endpoint.options.public")}</option>
              <option value={EndpointType.Private}>{translate("signIn.form.endpoint.options.private")}</option>
            </Form.Select>
          </Col>
          {
            watch("endpointType") !== EndpointType.Private
              ? null
              : <Col
                sm={1}
                className="d-flex justify-content-center align-items-center"
              >
                <Button
                  variant="link"
                  className="private-endpoint-setting"
                  onClick={props.onClickPrivateEndpointSetting}
                >
                  <i className="bi bi-gear-fill"/>
                </Button>
              </Col>
          }
        </Form.Group>

        <Form.Group as={Row} className="mb-3" controlId="accessKey">
          <Form.Label className="text-end" column sm={4}>
            <span className="text-danger">*</span>{translate("signIn.form.accessKeyId.label")}
          </Form.Label>
          <Col sm={7}>
            <Form.Control
              {...register("accessKey", {required: true})}
              type="text"
              placeholder={translate("signIn.form.accessKeyId.holder")}
              isInvalid={Boolean(errors.accessKey)}
            />
            <Form.Control.Feedback type="invalid">
              {translate("signIn.form.accessKeyId.feedback.required")}
            </Form.Control.Feedback>
          </Col>
        </Form.Group>

        <Form.Group as={Row} className="mb-3" controlId="accessSecret">
          <Form.Label className="text-end" column sm={4}>
            <span className="text-danger">*</span>{translate("signIn.form.accessKeySecret.label")}
          </Form.Label>
          <Col sm={7}>
            <Form.Control
              {...register("accessSecret", {required: true})}
              type="password"
              placeholder={translate("signIn.form.accessKeySecret.holder")}
              isInvalid={Boolean(errors.accessSecret)}
            />
            <Form.Control.Feedback type="invalid">
              {translate("signIn.form.accessKeySecret.feedback.required")}
            </Form.Control.Feedback>
          </Col>
        </Form.Group>

        {
          !watch("rememberMe")
            ? null
            : <Form.Group
              as={Row}
              className="mb-3"
              controlId="description"
            >
              <Form.Label className="text-end" column sm={4}>
                {translate("signIn.form.description.label")}
              </Form.Label>
              <Col sm={7}>
                <Form.Control
                  {...register("description", {maxLength: 20})}
                  type="text"
                  placeholder={translate("signIn.form.description.holder")}
                  isInvalid={Boolean(errors.description)}
                />
                <Form.Control.Feedback type="invalid">
                  {translate("signIn.form.description.feedback.maxLength")}
                </Form.Control.Feedback>
              </Col>
            </Form.Group>
        }

        <Form.Group as={Row} className="mb-3" controlId="rememberMe">
          <Col sm={{span: 5, offset: 4}}>
            <Form.Check
              {...register("rememberMe")}
              label={translate("signIn.form.rememberMe.label")}
            />
          </Col>
          <Col sm={{span: 2}}>
            <Button
              variant="link"
              size="sm"
              onClick={props.onClickAccessKeyHistory}
            >
              {translate("signIn.accessKeyHistory")}
            </Button>
          </Col>
        </Form.Group>
      </fieldset>

      <Form.Group as={Row} className="mb-3">
        <Col sm={{span: 7, offset: 4}}>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {
              isSubmitting
                ? <>
                  <Spinner className="me-2" animation="border" size="sm"/>
                  {translate("signIn.form.submitting")}
                </>
                : translate("signIn.form.submit")
            }
          </Button>
        </Col>
      </Form.Group>
    </Form>
  );
};

export default SignInForm;
