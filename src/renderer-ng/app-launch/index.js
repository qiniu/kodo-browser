import webModule from '../app-module/web'

import appConfig from './app-config'
import appRun from './app-run'

import './app.css'

webModule
  .config(appConfig)
  .run(appRun)

