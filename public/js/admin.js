'use strict';


function showAlert(text, type) {
  // TODO: toggle classes for appropiate styling ('success', 'error')
  $('#info').html(text);
  $('html, body').animate({
    scrollTop: $('#info').offset().top - 20
  }, 400);
}

$(document).ready(function() {
  // submit handler for forms
  $('form').submit(function() {
    var that = this;
    
    // submit via ajax
    $.ajax({
      data: $(that).serialize(),
      type: $(that).attr('method'),
      url:  $(that).attr('action') + $('[name=amount]').val(),
      error: function(xhr, status, err) {
        showAlert(xhr.responseText, 'error');
      },
      success: function(res) {
        // Show Success
        showAlert(res, 'success');
      }
    });
    return false;
  });

});