'use strict';

// called from menu buttons
// shows / hides the correct input fields
function toggleView(mode) {
  if (mode === 'menu') {
    $('form').addClass('hidden');
    $('#back').addClass('hidden');
    $('#menu').removeClass('hidden');
    return;
  }

  if (mode === 'register')
    $('#form-register').removeClass('hidden');
  else if (mode === 'waitlist')
    $('#form-waitlist').removeClass('hidden');
  else if (mode === 'optout')
    $('#form-optout').removeClass('hidden');

  $('#menu').addClass('hidden');
  $('#back').removeClass('hidden');
}

function showAlert(text, type) {
  // toggle classes for appropiate styling ('success', 'error')
  $('#info').removeClass('success error');
  $('#info').addClass(type);

  $('html, body').animate({ scrollTop: 0 }, 400);
  $('#info').html(text).fadeIn(200).delay(5000).fadeOut(400);
}

$(document).ready(function() {
  // submit handler for forms
  $('form').submit(function() {
    var that = this;

    // validate email confirmation
    if ($('#email').val() !== $('#email-confirmation').val()) {
      showAlert('email stimmt nicht überein!', 'error');
      return false;
    }

    // submit via ajax
    $.ajax({
      data: $(that).serialize(),
      type: $(that).attr('method'),
      url:  $(that).attr('action'),
      error: function(xhr, status, err) {
        try {
          const error = JSON.parse(xhr.responseText)
          showAlert(error.errors.map(e => e.message).join('<br>'), 'error');
        } catch (e) {
          showAlert(xhr.responseText, 'error');
        }
      },
      success: function(res) {
        // reset the view
        toggleView('menu');
        $(that).trigger('reset');
        showAlert(res, 'success');
      }
    });
    return false;
  });

});
