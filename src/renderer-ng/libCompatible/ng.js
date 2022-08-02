// 部分依赖包只认 window 上的 angular
// TODO: best way maybe webpack shimming
import angular from 'angular'

window.angular = angular

export default window.angular
