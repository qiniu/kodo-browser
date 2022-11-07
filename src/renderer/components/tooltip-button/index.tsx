import React from "react";
import {Button, OverlayTrigger, Tooltip} from "react-bootstrap";
import {Placement} from "react-bootstrap/types";
import {ButtonProps} from "react-bootstrap/Button";

interface TooltipButtonProps {
  iconClassName: string,
  tooltipPlacement?: Placement,
  tooltipContent: string,
  show?: boolean,
}

const TooltipButton: React.FC<ButtonProps & TooltipButtonProps> = (props) => {
  const {
    iconClassName,
    tooltipPlacement,
    tooltipContent,
    show,
    ...buttonProps
  } = props;

  // fix always show tip when disabled false->true
  const showTip = show === undefined
    ? buttonProps.disabled ? false : undefined
    : show;

  return (
    <OverlayTrigger
      show={showTip}
      placement={tooltipPlacement ?? "auto"}
      overlay={
        <Tooltip>
          {tooltipContent}
        </Tooltip>
      }
    >
      <Button variant="outline-solid-gray-300" {...buttonProps}>
        <i className={iconClassName}/>
      </Button>
    </OverlayTrigger>
  )
}

export default TooltipButton;
