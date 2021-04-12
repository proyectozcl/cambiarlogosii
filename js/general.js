var s = 120, obj, r;

$(function () {
  $('#divFld').html(getField({ type: 'upf', name: 'imgLog', isImg: true, imgPrev: true, accept: '.jpg,.jpeg,.png,.gif' }));
  $.each($('.upf'), function () { setUpf($(this)); });
  $('#btnDwn').click(function () { downImg(); });
  setFormJz();
});

function callback_img() {
  $('.cnvImg').remove(); var img = new Image(); obj = img; r = false;
  img.addEventListener('load', function () { while (!r) obj = redim(); });
  img.src = $('#upfp_imgLog img').attr('src');
}

function redim() {
  var h = obj.height * .5;
  var w = obj.width * .5;

  if (h < s && w < s) {
    if (w > h) { h = Math.round(s / (w / h)); w = s; }
    else if (w < h) { w = Math.round(s / (h / w)); h = s; }
    else { h = s; w = s; }
    r = true;
  }

  var cnv = document.createElement('canvas');
  var ctx = cnv.getContext('2d');
  document.body.appendChild(cnv);
  cnv.className = 'cnvImg';

  if (!r) {
    cnv.width = w;
    cnv.height = h;
    cnv.style.width = w;
    cnv.style.height = h;
    ctx.drawImage(obj, 0, 0, w, h);
    return cnv;
  }
  else {
    cnv.width = s;
    cnv.height = s;
    cnv.style.width = s;
    cnv.style.height = s;
    ctx.fillStyle = "#FFF";
    ctx.fillRect(0, 0, s, s);
    if (w > h) ctx.drawImage(obj, 0, (s - h) / 2, w, h);
    else if (w < h) ctx.drawImage(obj, (s - w) / 2, 0, w, h);
    else ctx.drawImage(obj, 0, 0, w, h);
    $('#divGen').html('<img src="' + cnv.toDataURL('image/jpeg') + '" />');
    $('.cnvImg').remove();
  }
}

function downImg() {
  var a = document.createElement('a');
  a.href = $('#divGen img').attr('src');
  a.download = 'logo-sii.jpg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function setFormJz() {
  var str_ok = 'Muchas gracias por escribirnos.<br />Te responderemos a la brevedad.';
  var strErr = 'Se ha producido un error.<br />Inténtalo nuevamente más tarde.';
  formjz({
    fields: [
      {
        type: 'txt', name: 'nom', ml: 50, maskjz: 'name', idMsg: '#spanMsg', arrVal: [
          { v: 'req', m: '* Debes ingresar tu Nombre' },
          { v: 'min', m: '* Tu nombre debe tener al menos 3 letras', d: 3 }
        ]
      },
      {
        type: 'txt', name: 'eml', ml: 50, maskjz: 'mail', idMsg: '#spanMsg', arrVal: [
          { v: 'req', m: '* Debes ingresar tu Email' },
          { v: 'eml', m: '* El formato de tu Email no es válido' },
        ]
      },
      {
        type: 'txa', name: 'msg', ml: 1000, idMsg: '#spanMsg', arrVal: [
          { v: 'req', m: '* Debes ingresar tu mensaje' },
          { v: 'min', m: '* Tu mensaje debe tener al menos 8 caracteres', d: 8 }
        ]
      }
    ],
    idBtnSend: '#btnSend', send: {
      urlSend: 'code/ws.asmx/sendMail',
      fnPreSend: function () { $('#spanMsg').addClass('msg').html('Enviando datos...'); },
      fnPostSend: function (d) {
        $('#spanMsg').addClass(d.d.error ? 'err' : 'ok').html(d.d.error ? strErr : str_ok);
        if (!d.d.error) {
          $('#txt_nom').focus();
          $('.txt').val('');
        }
      },
      fnFailSend: function () { $('#spanMsg').addClass('err').html(strErr); },
      fnAlways: function () { $('#btnSend').prop('disabled', false); }
    }
  });
}