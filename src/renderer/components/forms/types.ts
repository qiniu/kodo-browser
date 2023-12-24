export interface FormComponentBaseProps<T = string> {
  onChange: (val?: T) => void,
  onBlur: (val?: T) => void,
  name: string,
  required?: boolean,
  disabled?: boolean,

  value?: T,

  isInvalid?: boolean,
}

export interface FormSelectProps<T> extends FormComponentBaseProps<T> {
  options: T[],
}

export interface FormSwitchProps<T> extends FormComponentBaseProps<T> {
  label: string,
}
