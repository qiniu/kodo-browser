import jquery from 'jquery'

window.$ = jquery
window.jQuery = jquery

$(function () {
  $(document).on('dragover', function (ev) {
    ev.preventDefault();
    return false;
  })
  $(document).on('drop', function (ev) {
    ev.preventDefault();
    return false;
  })
});

export default jquery
