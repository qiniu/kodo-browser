import ng from "@/libCompatible/ng"
import uiRouter from "@uirouter/angularjs"
import uiBootstrap from "angular-ui-bootstrap"
import uiCodemirror from "@/libCompatible/ui-codemirror"
import pascalprechtTranslate from "@/libCompatible/translate-pascalprecht"
import ngSanitize from "angular-sanitize"

import templateModule from './templates'

export default ng.module("web", [
  uiRouter,
  uiBootstrap,
  uiCodemirror.name,
  pascalprechtTranslate,
  ngSanitize,
  templateModule.name,
])
