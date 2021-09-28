// 样式文件依赖
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-table/dist/bootstrap-table.min.css' // 后续可能移动到模块内部
import 'font-awesome/css/font-awesome.css'

// 兼容 kodo-s3-adapter-sdk 依赖的 FormData
import './libCompatible/form-data'

// 依赖顺序不可变，bad but work
import './libCompatible/jq'
import 'jquery.qrcode'
import 'bootstrap/dist/js/bootstrap'
import 'bootstrap-table'

// 自定义 factories
import './const'
import './customize'
import './components/services'

// 自定义 directives
import './components/directives'
import './main/files/modals/preview/restore-checker'

// 自定义 filters
import './components/filters'

// controllers
import './main/main'

// app 启动
import './app-launch'
