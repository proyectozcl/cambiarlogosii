/* formjz: Librería JavaScript [Automatizar Formularios] */
/* 2016/11/11 - v1.0 */
/* 2017/04/28 - v2.0 */
/* 2017/06/14 - v2.1 */
/* 2018/02/08 - v3.0 */
/* 2018/10/05 - v3.5 */
/* 2019/01/18 - v4.0 */

var gbl_arrLst = [], gbl_arrFjz = [];
var gbl_arrUpmDel = [], gbl_arrUpm;
var gbl_upmCant, gbl_upmCont;

function formjz(f, fnGetData, fnSendClickPrev) {
  var id = f.id ? f.id : 'gbl_oFjz';
  var obj = findInArrObj(gbl_arrFjz, 'id', id);
  if (!obj) gbl_arrFjz.push({ id: id, f: f });
  else obj = { id: id, f: f };

  var fjz = f;
  if (f.fields) {
    f.s = true;
    var nc = f.fields.length;
    $.each(f.fields, function (i) {
      var fld = this, id = fjz_getId(this);
      if (fld.setFld == false) return;
      if (fld.maskjz) $(id).maskjz(fld.maskjz);
      if (fld.type == 'chk') $(id).prop('checked', fld.def);
      else if (fjz.reset != false && !fld.ctrl) $(id).val(fld.def);
      $(id).prop('maxlength', fld.ml).unbind('keydown.fjz blur.fjz keyup.fjz change.fjz')
        .on('keydown.fjz', function (e) {
          if (e.keyCode == 13 && fld.type != 'txa' && fld.type != 'upf') { f.s = false; fjz_send(e); }
          if (e.keyCode == 9) { if (!e.shiftKey && i < nc - 1) focusAtEnd(e, i + 1); else if (e.shiftKey && i > 0) focusAtEnd(e, i - 1); }
        }).on('blur.fjz', function () { if (f.s && !$(id).prop('disabled')) fjz_clrErr(fld, fjz); })
        .on('keyup.fjz', function () { if (fjz.focusBtn) $(f.idBtnSend).addClass('changes'); })
        .on('change.fjz', function () { if (fjz.focusBtn) $(f.idBtnSend).addClass('changes'); if (fjz.fnChange) fjz.fnChange(); });
      //.change(function () { if (fjz.focusBtn) $(f.idBtnSend).addClass('changes'); if (fjz.fnChange) fnChange_gcl(); });
    });
  }
  if (fnSendClickPrev) $(f.idBtnSend).off('click.prev').on('click.prev', function () { fnSendClickPrev(); });
  $(f.idBtnSend).prop('disabled', false).off('click.fjz').on('click.fjz', function (e) { if ($(this).attr('href') == '#') e.preventDefault(); fjz_send(); });
  $(f.idFocus).focus();
  f.fnSend = fjz_send;

  function fjz_send(e, caller) {
    fjz_clrErrAll();
    if (e) e.preventDefault();
    if (!fjz_validate(fjz)) return;
    var s = fjz.send;
    if (s.fnPreSend && s.fnPreSend(caller) == false) return;
    $(fjz.idBtnSend).prop('disabled', true).removeClass('changes');
    $.ajax({
      type: 'POST', url: s.urlSend, data: fnGetData ? fnGetData() : fjz_getData(),
      xhr: function () {
        var xhr = $.ajaxSettings.xhr();
        if (!fjz.showProg || !fjz.idMsg) return xhr;
        $(fjz.idMsg).append(' <span id="spnPrg" class="spnPrg"></span>');
        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable) {
            if (e.loaded / e.total != 1) {
              var pr = Math.round(e.loaded / e.total * 100);
              var mb = (e.total * 0.75 / 1048576).toFixed(2);
              $('#spnPrg').html('(' + pr + '% - ' + mb + 'Mb)');
            }
            else showMsg({ msg: 'Procesando datos...', idMsg: fjz.idMsg });
          }
        }
        return xhr;
      }
    })
      .done(function (d) {
        if (d.d.err) s.fnPostSend(d);
        else {
          var upm; $.each(fjz.fields, function () { if (this.type == 'upm') { upm = this; return false; } });
          if (!upm) s.fnPostSend(d); else {
            if (gbl_arrUpmDel.length > 0) sendUpmDel(s, d, gbl_arrUpmDel.length, 0, upm);
            else sendUpm(s, d, null, 0, upm);
          }
        }
      })
      .fail(function (e) { if (s.fnFailSend) s.fnFailSend(); else valErrSrv(e, fjz.idBtnSend, fjz.idMsg); })
      .always(function () { if (typeof s.fnAlways === "function") s.fnAlways(); });
  }

  function sendUpmDel(s, d, c, i, upm) {
    if (c == i) return sendUpm(s, d, null, 0, upm);
    showMsg({ idMsg: upm.idMsg, msg: 'Removiendo archivo ' + (i + 1) + ' de ' + c + '...' });
    $.ajax({
      type: 'POST', url: jz.removeLastChars(s.urlSend, 4) + '_upm',
      data: JSON.stringify({ id_upm: d.d.oResp.id_upm, name: gbl_arrUpmDel[i].name, base64: '', del: true })
    }).done(function () { sendUpmDel(s, d, c, i + 1, upm); }).fail(function (e) { valErrSrv(e); });
  }

  function sendUpm(s, d, c, i, upm, arr) {
    if (c == null) { c = 0, arr = []; $.each(gbl_arrUpm, function () { if (this.orig == 'upm') { c++; arr.push(this); } }); }
    if (c == i) { s.fnPostSend(d); $('#upmp_' + upm.name).html(gbl_galImg); return; }
    $.ajax({
      type: 'POST', url: jz.removeLastChars(s.urlSend, 4) + '_upm',
      data: JSON.stringify({ id_upm: d.d.oResp.id_upm, name: arr[i].name, base64: arr[i].base64, del: false }),
      xhr: function () {
        var xhr = $.ajaxSettings.xhr(); if (!fjz.idMsg) return xhr;
        showMsg({ idMsg: upm.idMsg, msg: 'Cargando archivo ' + (i + 1) + ' de ' + c + '...' });
        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable) {
            if (e.loaded / e.total != 1) {
              var pr = Math.round(e.loaded / e.total * 100);
              var mb = (e.total * 0.75 / 1048576).toFixed(2);
              showMsg({ msg: '(' + pr + '% - ' + mb + 'Mb)', idMsg: fjz.idMsg, spin: false });
            } else showMsg({ msg: 'Procesando datos...', idMsg: fjz.idMsg });
          }
        }
        return xhr;
      }
    }).done(function () { sendUpm(s, d, c, i + 1, upm, arr); }).fail(function (e) { valErrSrv(e); });
  }

  function fjz_getData() {
    try { fjz.fields = fjz.fields(); } catch (e) { };
    var obj = new Object();
    $.each(fjz.fields, function () {
      var id = fjz_getId(this, 'val');
      if (this.type == 'val') obj[this.name] = this.val;
      else if (this.type == 'arr') obj[this.name] = this.fnData();
      else if (this.type == 'chk') obj[this.name] = $(id).prop('checked');
      else if (this.type == 'ddl') obj[this.name] = $(id).val() == this.noVal ? '' : $(id).val();
      else if (this.send != false) obj[this.name] = $.trim(this.fnData ? this.fnData($(id).val()) : $(id).val());
    });
    return JSON.stringify(obj);
  }

  function fjz_validate(fjz) {
    var blnVal = true;
    if ($(fjz.idBtnSend).prop('disabled')) return false;
    $.each(fjz.fields, function () {
      if (!blnVal) return false;
      var fld = this; var req = false;
      $.each(this.arrVal, function () { if (this.v == 'req') req = true; });
      $.each(this.arrVal, function () {
        if (!blnVal) return false;
        if (req || this.v == 'rcd' || this.v == 'cnd') blnVal = fjz_val(fld, this, fjz);
        else if ($(fjz_getId(fld, 'val')).val() != '') blnVal = fjz_val(fld, this, fjz);
      });
      if (blnVal && this.type == 'upm' && $('#upmp_' + this.name).find('.spnErr').length > 0)
        blnVal = fjz_setErr(fld, 'Hay imágenes inválidas en la galería');
    });
    return blnVal;
  }

  function focusAtEnd(e, i) {
    var fld = fjz.fields[i];
    var id = fjz_getId(fld);
    if (fld.type == 'hdn' || $(id).prop('disabled')) return;
    $.each(fjz.fields, function () { fjz_clrErr(this, fjz); });
    if ($(id).hasClass('hte')) return;
    e.preventDefault();
    focusCaret(id);
  }
}

function fjz_val(fld, v, fjz) {
  var id = fjz_getId(fld, 'val');
  switch (v.v) {
    //Dictionary:
    //ext: Extension File
    //mfs: Max File Size
    //imw: Image Width
    //imh: Image Height
    //req: Campo Requerido
    //rcd: Requerido Condicional
    //min: Largo Mínimo
    //eml: Formato Email
    //dmd: Date Match Day
    //mch: Match
    //nmc: No Match
    //chk: Checked
    //rut: Formato Rut
    //mms: Formato m:ss/mm:ss/mmm:ss/mmmm:ss
    //hor: Formato Hora
    //fec: Formato Fecha
    //cnd: Condición
    case 'ext': var arr = $('#upfn_' + fld.name).html().split('.'); if (!isIn(v.d, arr[arr.length - 1].toLowerCase())) return fjz_setErr(fld, v.m, fjz); break;
    case 'mfs': if ($('#upfm_' + fld.name).html() > v.d) return fjz_setErr(fld, v.m.replace('[X]', v.d), fjz); break;
    case 'imw': if ($('#upfw_' + fld.name).val() != v.d) return fjz_setErr(fld, v.m.replace('[X]', v.d), fjz); break;
    case 'imh': if ($('#upfh_' + fld.name).val() != v.d) return fjz_setErr(fld, v.m.replace('[X]', v.d), fjz); break;
    case 'rcd': if (($.trim($(id).val()) == '' || $.trim($(id).val()) == fld.noVal) && v.fn()) return fjz_setErr(fld, v.m, fjz); break;
    case 'req': if ($.trim($(id).val()) == '' || $.trim($(id).val()) == fld.noVal) return fjz_setErr(fld, v.m, fjz); break;
    case 'min': if ($.trim($(id).val()).length < v.d) return fjz_setErr(fld, v.m.replace('[X]', v.d), fjz); break;
    case 'eml': if (!regExpValEml.test($(id).val())) return fjz_setErr(fld, v.m, fjz); break;
    case 'dmd': if (getNumDayDP(id) != $(v.d).val()) return fjz_setErr(fld, v.m, fjz); break;
    case 'mch': if ($(id).val() != $(v.d).val()) return fjz_setErr(fld, v.m, fjz); break;
    case 'nmc': if ($(id).val() == $(v.d).val()) return fjz_setErr(fld, v.m, fjz); break;
    case 'rut': if (!getRut($(id).val()).valid) return fjz_setErr(fld, v.m, fjz); break;
    case 'chk': if (!$(id).prop('checked')) return fjz_setErr(fld, v.m, fjz); break;
    case 'mms': if ($(id).val().length < 4) return fjz_setErr(fld, v.m, fjz); break;
    case 'hor': if ($(id).val().length < 5) return fjz_setErr(fld, v.m, fjz); break;
    case 'fec': if (!valDate($(id).val())) return fjz_setErr(fld, v.m, fjz); break;
    case 'cnd': if (v.fn()) return fjz_setErr(fld, v.m, fjz); break;
  }
  return true;
}

/* --- */

var regExpValEml = /^[A-Za-z0-9]([-\.]?[_]*?[A-Za-z0-9]+)*@[A-Za-z0-9]+(\.[a-zA-Z0-9-]+)*\.(([0-9]{1,3})|([a-zA-Z]{2,4}))$/;

function getNumDayDP(id) {
  var d = $(id).datepicker('getDate').getDay();
  return d > 0 ? d : 7;
}

/* --- */

function fjz_setErr(fld, m, fjz) {
  var id = fjz_getId(fld);
  var idMsg = fld.idMsg ? fld.idMsg : fjz && fjz.idMsg ? fjz.idMsg : '#spnMsg';
  showMsg({ msg: m, idMsg: idMsg, cls: 'err' });
  $(fjz_getId(fld, 'lbl')).addClass('err').focus();
  if ($(id).hasClass('hte')) $(id).parent().addClass('err').find('.divHte').focus();
  return false;
}

function fjz_clrErr(fld, fjz) {
  var id = fjz_getId(fld);
  $(fjz_getId(fld, 'lbl')).removeClass('err');
  if ($(id).hasClass('hte')) $(id).parent().removeClass('err');
  var idMsg = fld.idMsg ? fld.idMsg : fjz && fjz.idMsg ? fjz.idMsg : '#spnMsg';
  clearMsg(idMsg);
  return false;
}

function fjz_clrErrAll() {
  $.each(gbl_arrFjz, function () {
    var fjz = this.f;
    if (fjz.idMsg) clearMsg(fjz.idMsg);
    $(fjz.idBtnSend).removeClass('changes');
    $.each(fjz.fields, function () { fjz_clrErr(this, fjz); });
  });
}

function focusCaret(id) {
  if ($(id).attr('type') == 'text' || $(id).is('textarea')) {
    var len = $(id).val().length;
    $(id).caret(len, len);
  }
  $(id).focus();
  return false;
}

function focusFldErr(idFldErr) {
  var id = '#' + idFldErr;
  $(id).addClass('err');
  focusCaret(id);
}

/* --- */

function getName_oJq(oJq) {
  return oJq.prop('id').split('_')[1];
}

function fjz_getId(fld, prefType) {
  return '#' + fjz_getPref(fld, prefType) + '_' + fld.name;
}

function fjz_getPref(fld, prefType) {
  if (prefType == 'lbl' && (fld.type == 'upf' || fld.type == 'upm')) return 'upl';
  if (prefType == 'val' && (fld.type == 'upf' || fld.type == 'upm')) return 'upi';
  if (prefType == 'val' && fld.type == 'auc') return 'aui';
  return fld.type;
}

/* --- */

function getField(fld) {
  switch (fld.type) {
    case 'str': return fld.text ? fld.text : '';
    case 'lnk': return '<a href="javascript:' + fld.fn + '();" id="lnk_' + fld.name + '">' + fld.def + '</a>';
    case 'hdn': return '<input type="hidden" class="inp hdn' + (fld.cls ? ' ' + fld.cls : '') + '" id="hdn_' + fld.name + '" value="' + (fld.def ? fld.def : '') + '" />'; break;
    case 'txt': return '<input type="text" class="inp txt' + (fld.cls ? ' ' + fld.cls : '') + '" id="txt_' + fld.name + '" value="' + (fld.def ? fld.def : '') + '" placeholder="' + (fld.plh ? fld.plh : '') + '" />'; break;
    case 'txa': return '<textarea class="inp txa h100' + (fld.cls ? ' ' + fld.cls : '') + '" id="txa_' + fld.name + '"></textarea>'; break;
    case 'chk': return '<label class="chk"><input type="checkbox" class="' + (fld.cls ? ' ' + fld.cls : '') + '" id="chk_' + fld.name + '" ' + (fld.def ? 'checked' : '') + ' /><span></span></label>'; break;
    case 'ddl': return '<label class="ddl"><select class="' + (fld.cls ? ' ' + fld.cls : '') + '" id="ddl_' + fld.name + '"><option value="' + fld.def + '">Cargando datos...</option></select><span></span></label>'; break;
    case 'auc':
      str = '';
      str += '<input type="hidden" class="inp" id="aui_' + fld.name + '" />';
      str += '<input type="text" class="inp auc' + (fld.cls ? ' ' + fld.cls : '') + '" id="auc_' + fld.name + '" autocomplete="off" disabled="disabled" placeholder="Cargando datos..." />';
      return str;
    case 'upf':
      var isImg = fld.isImg ? 'data-is-img="' + fld.isImg + '"' : '';
      var imgPrev = fld.imgPrev ? 'data-img-prev="' + fld.imgPrev + '"' : '';
      var maxSizeMb = fld.maxSizeMb ? 'data-maxSizeMb="' + fld.maxSizeMb + '"' : '';
      var maxPixels = fld.maxPixels ? 'data-maxPixels="' + fld.maxPixels + '"' : '';
      var reqH = fld.requiredHeight ? 'data-h="' + fld.requiredHeight + '"' : '';
      var reqW = fld.requiredWidth ? 'data-w="' + fld.requiredWidth + '"' : '';
      var maxH = fld.maxHeight ? 'data-hMax="' + fld.maxHeight + '"' : '';
      var maxW = fld.maxWidth ? 'data-wMax="' + fld.maxWidth + '"' : '';
      var vars = isImg + ' ' + imgPrev + ' ' + maxSizeMb + ' ' + maxPixels + ' ' + reqH + ' ' + reqW + ' ' + maxH + ' ' + maxW;

      str = '';
      str += '<span class="spnWrpUpf">';
      str += '  <label id="upl_' + fld.name + '" for="upf_' + fld.name + '" class="inp' + (fld.cls ? ' ' + fld.cls : '') + '">';
      str += '    <span class="fa fa-cloud-upload"></span> Subir Archivo';
      str += '    <input type="hidden" id="upi_' + fld.name + '">';
      str += '    <input type="file" id="upf_' + fld.name + '" class="upf vhd" accept="' + fld.accept + '"' + vars + ' />';
      str += '  </label>';
      str += '  <span class="spnUpf">';
      str += '    <span class="upft upfd" id="upfn_' + fld.name + '">' + gbl_noFile + '</span>';
      str += '    <span class="upft upfd now" id="upfs_' + fld.name + '"></span>';
      str += '  </span>';
      if (fld.isImg) {
        str += '  <input type="hidden" id="upfw_' + fld.name + '">';
        str += '  <input type="hidden" id="upfh_' + fld.name + '">';
        str += '  <span class="upft" id="upfx_' + fld.name + '">&nbsp;</span>';
      }
      if (fld.isImg && fld.imgPrev) {
        str += '  <label class="upfp" for="upf_' + fld.name + '">';
        str += '    <div class="upfpv inp" id="upfp_' + fld.name + '" style="' + (fld.style ? fld.style : '') + '">' + gbl_imgPrv + '</div>';
        str += '  </label>';
      }
      str += '</span>';
      return str;
    case 'upm':
      str = '';
      str += '<span class="spnWrpUpf">';
      str += '  <label id="upl_' + fld.name + '" for="upm_' + fld.name + '" class="inp' + (fld.cls ? ' ' + fld.cls : '') + '">';
      str += '    <span class="fa fa-cloud-upload"></span> Subir Archivos';
      str += '    <input type="hidden" id="upi_' + fld.name + '">';
      str += '    <input type="file" id="upm_' + fld.name + '" class="upm vhd" accept="' + fld.accept + '" multiple />';
      str += '  </label>';
      str += '  <span class="spnUpt" id="upt_' + fld.name + '">' + fld.txtUpm + '</span>';
      str += '  <span class="spnUpm container" id="upmp_' + fld.name + '">' + gbl_galImg + '</span>';
      str += '</span>';
      return str;
  }
}

function setUpm(oJq) {
  var name = getName_oJq(oJq), fld;
  $.each(gbl_oFjz.fields, function () { if (this.name == name) fld = this; });
  oJq.change(function () {
    if ($(this).val() == 0) return;
    showMsg({ msg: 'Cargando archivos...', idMsg: fld.idMsg });
    var arr = $(this)[0].files, cant = Math.min(fld.maxCant - gbl_arrUpm.length, arr.length);
    for (var i = 0; i < cant; i++) setArrUpm(oJq, name, arr[i], fld, i, cant);
    if (cant == 0) clearMsg(fld.idMsg);
  })
    .on('focus.upm', function () { $('#upl_' + name).addClass('focus'); })
    .on('blur.upm', function () { $('#upl_' + name).removeClass('focus'); });
}

function setArrUpm(oJq, name, file, fld, i, cant) {
  var r = new FileReader();
  r.onload = function () {
    if (!findInArrObj(gbl_arrUpm, 'name', file.name)) gbl_arrUpm.push({ file: file, name: file.name, base64: r.result, orig: 'upm' });
    if (i == cant - 1) setTimeout(function () { setListUpm(fld); }, 100);
  }
  r.readAsDataURL(file);
}

function setListUpm(fld) {
  var i = 0;
  $('#upmp_' + fld.name + ' span').remove();
  gbl_arrUpm = sortArrObjByKey(gbl_arrUpm, 'name');
  $.each(gbl_arrUpm, function () {
    var f = this.file, u = this.url, n = this.name, img = new Image(), str = '';

    var arrVal = [];
    if (f) {
      var fileSize = getSizeMb(f.size);
      var filExt = getExtensionFromFileName(f.name, true);
      var arrExt = $('#upm_' + fld.name).prop('accept').split(',');

      if (!isIn(arrExt, filExt.toLowerCase())) arrVal.push('El formato del archivo (' + filExt + ') no es aceptado');
      if (fileSize > fld.maxSizeMb) arrVal.push('El tamaño del archivo (' + fileSize + ' Mb) es mayor al aceptado (' + fld.maxSizeMb + ' Mb)');
    }

    img.addEventListener('load', function () {
      var wImg = img.width, hImg = img.height;

      var mp = fld.maxPixels;
      if (mp) {
        if (wImg > mp || hImg > mp) {
          img.src = resizeImageToBase64(img, wImg / 2, hImg / 2);
          return;
        }
      }
      var wRes = fld.resizeWidth;
      if (wRes && wRes != wImg) {
        if (wRes > wImg) {
          if (wImg * 2 > wRes) img.src = resizeImageToBase64(img, wImg * 2, hImg * 2);
          else img.src = resizeImageToBase64(img, wRes, parseInt(hImg * (wRes / wImg)));
          return;
        }
        if (wRes < wImg) {
          if (wImg / 2 > wRes) img.src = resizeImageToBase64(img, wImg / 2, hImg / 2);
          else img.src = resizeImageToBase64(img, wRes, parseInt(hImg * (wRes / wImg)));
          return;
        }
      }
      var hRes = fld.resizeHeight;
      if (hRes && hRes != hImg) {
        if (hRes > hImg) {
          if (hImg * 2 > hRes) img.src = resizeImageToBase64(img, wImg * 2, hImg * 2);
          else img.src = resizeImageToBase64(img, parseInt(wImg * (hRes / hImg)), hRes);
          return;
        }
        if (hRes < hImg) {
          if (hImg / 2 > hRes) img.src = resizeImageToBase64(img, wImg / 2, hImg / 2);
          else img.src = resizeImageToBase64(img, parseInt(wImg * (hRes / hImg)), hRes);
          return;
        }
      }

      setArrUpmImgResize(n, img.src);
      var wFld = fld.requiredWidth, hFld = fld.requiredHeight, wMax = fld.maxWidth, hMax = fld.maxHeight;

      if (wFld && wFld != wImg) arrVal.push('El ancho de la imagen (' + wImg + ') no es correcto');
      if (hFld && hFld != hImg) arrVal.push('El alto de la imagen (' + hImg + ') no es correcto');
      if (wMax && wMax < wImg) arrVal.push('El ancho máximo de la imagen (' + wImg + ') no es correcto');
      if (hMax && hMax < hImg) arrVal.push('El alto máximo de la imagen (' + hImg + ') no es correcto');
      if (fld.onlyHorizontal && hImg > wImg) arrVal.push('La imagen debe ser horizontal');
      if (fld.onlyVertical && hImg < wImg) arrVal.push('La imagen debe ser vertical');
      if (fld.onlySquared && hImg != wImg) arrVal.push('La imagen debe ser cuadrada');

      str += '<span class="cols col_25 rel">';
      str += '  <span class="spnWrpImg">';
      str += '    <span class="spnUmpX"></span>';
      str += '    <img data-name="' + n + '" src="' + img.src + '" class="img" />';
      if (arrVal.length > 0) {
        str += '<span class="spnErr">';
        $.each(arrVal, function () { str += '<span class="spnInv">' + this + '</span>'; });
        str += '  </span>';
      } else {
        var link = document.createElement('a'); link.href = u + n;
        link = link.protocol + "//" + link.host + link.pathname;
        str += '<span class="spnLnk">';
        str += '  <span class="spnInv">';
        str += '    <a href="' + u + n + '" class="wsn" target="_blank">Ver <span class="fa fa-external-link"></span></a>';
        str += '    <span class="mh05"></span>';
        str += '    <a href="#" class="wsn ancCpyLnk" data-clipboard-text="' + link + '" title="Copiado">Copiar Enlace <span class="fa fa-link"></span></a>';
        str += '  </span>';
        str += '</span>';
      }
      str += '  </span>';
      str += '</span>';
      window.URL.revokeObjectURL(img.src);
      $('#upmp_' + fld.name).append(str);
      $('.ancCpyLnk').off('click').on('click', function () {
        $('<div id="divMsgCpy">Copiado!</div>').append('body');
        zModal({ sel: '#divMsgCpy', cls: 'cen' });
        $('#divMsgCpy').remove();
      });
      new ClipboardJS('.ancCpyLnk');
      aHashPrev();

      if (++i == gbl_arrUpm.length) {
        $('.spnUmpX').off('click').on('click', function () { spnUmp_remove(this, fld); fjz_clrErrAll(); });
        setTimeout(function () { zModal_close(1, true, 500, true); }, 500);
        $('#upi_' + fld.name).val(i);
        clearMsg(fld.idMsg);
        fjz_clrErrAll();
      }
    });
    img.src = this.base64;
  });
}

function resizeImageToBase64(img, w, h) {
  var cnv = document.createElement('canvas');
  var ctx = cnv.getContext('2d');
  cnv.width = w; cnv.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  return cnv.toDataURL('image/jpeg');
}

function setArrUpmImgResize(n, base64) {
  $.each(gbl_arrUpm, function () { if (this.name == n) this.base64 = base64; });
}

function spnUmp_remove(obj, fld) {
  var name = $(obj).parent().find('img').attr('data-name'); $(obj).parent().parent().remove();
  $.each(gbl_arrUpm, function () { if (this.name == name) gbl_arrUpmDel.push(this); });
  gbl_arrUpm = gbl_arrUpm.filter(function (e) { return e.name != name; });
  if (gbl_arrUpm.length == 0) $('#upmp_' + fld.name).html(gbl_galImg);
  $('#upi_' + fld.name).val(gbl_arrUpm.length);
}

function getKeyName() {
  var keyName; $.each(gbl_oFjz.fields, function () { if (this.key) { keyName = this.name; return false; } }); return keyName;
}

function getFldUpm() {
  var fld; $.each(gbl_oFjz.fields, function () { if (this.type == 'upm') { fld = this; return false; } }); return fld;
}

/*
function getFolderName() {
  var keyName = getKeyName();
  return findInArrObj(gbl_arrDataList[gbl_entName], keyName, $('#hdn_' + keyName).val())[gbl_oFjz.folderNameFld];
}
*/

function getUpm() {
  //var id_upm = getFolderName();
  var fld = getFldUpm();
  var id_upm = strPad($('#hdn_' + getKeyName()).val(), '0', 6);
  $.post('/code/ws_sys.asmx/get_upm', JSON.stringify({ ent: gbl_entName, id_upm: id_upm }))
    .done(function (d) {
      if (d.d.oResp.arrUpm.length == 0) return;
      gbl_arrUpmDel = [], gbl_arrUpm = [], gbl_upmCont = 0, gbl_upmCant = d.d.oResp.arrUpm.length;
      $.each(d.d.oResp.arrUpm, function () { getImgFromUrl(fld.path + id_upm + '/', String(this), fld); });
      showMsgUpm();
    }).fail(function (e) { valErrSrv(e); });
}

function showMsgUpm() {
  var str = '';
  str += '<div id="divMsgUpm">';
  str += '  <br />';
  str += '  <span class="spnMsg pad inf" id="spnMsgUpm">';
  str += '    Cargando imágenes de la galería...';
  str += '    <span class="fa fa-spinner fa-pulse"></span>';
  str += '  </span>';
  str += '  <br /><br />';
  str += '</div>';
  $('body').append(str);
  zModal({ sel: '#divMsgUpm', cls: 'cen', close: false });
}

function getImgFromUrl(url, name, fld) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    var r = new FileReader();
    r.onload = function () {
      gbl_arrUpm.push({ url: url, name: name, base64: r.result, orig: 'srv' });
      if (gbl_upmCant == ++gbl_upmCont) setListUpm(fld);
    }
    r.readAsDataURL(xhr.response);
  };
  xhr.open('GET', url + name);
  xhr.responseType = 'blob';
  xhr.send();
}

/* --- */

function setUpf(oJq) {
  var name = getName_oJq(oJq);
  oJq.change(function () { setupReader(oJq, name, $(this)[0].files[0]); })
    .on('focus.upf', function () { $('#upl_' + name).addClass('focus'); })
    .on('blur.upf', function () { $('#upl_' + name).removeClass('focus'); });
}

function getSizeKb(s) {
  return (s / 1024).toFixed(1);
}

function getSizeMb(s) {
  return (s / 1048576).toFixed(2);
}

function getExtensionFromFileName(name, includeDot) {
  var arr = name.split('.');
  return (includeDot ? '.' : '') + arr[arr.length - 1];
}

function setupReader(oJq, name, file) {
  var r = new FileReader(), s;
  r.onload = function () {
    var arrExt = $('#upf_' + name).prop('accept').split(',');
    var filExt = getExtensionFromFileName(file.name, true);

    $('#upfn_' + name).html(file.name);
    if (!isIn(arrExt, filExt)) return $('#upfs_' + name).html('<span class="red">El formato del archivo no es aceptado</span>');

    var fileSize = getSizeMb(file.size);
    var fileSizeKb = getSizeKb(file.size);
    if (oJq.attr('data-maxSizeMb') && parseFloat(oJq.attr('data-maxSizeMb')) < fileSize)
      return $('#upfs_' + name).html('<span class="wsi red">El tamaño del archivo (' + fileSize + ' Mb) es mayor al aceptado (' + oJq.attr('data-maxSizeMb') + ' Mb)</span>');

    s = r.result;
    $('#upi_' + name).val(file.name + '|-|' + s);
    $('#upfs_' + name).html('(<span class="upfd" id="upfm_' + name + '">' + fileSizeKb + '</span>Kb)');

    if (oJq.attr('data-is-img') == "true") {
      $('#upfx_' + name).html('Calculando dimensiones...');
      var img = new Image();
      img.addEventListener('load', function () {
        var w = img.width, h = img.height;

        //RESIZER!
        if (oJq.attr('data-maxPixels')) {
          var mp = oJq.attr('data-maxPixels');
          if (w > mp || h > mp) {
            var w2 = w / 2, h2 = h / 2;
            var cnv = document.createElement('canvas');
            var ctx = cnv.getContext('2d');
            cnv.width = w2; cnv.height = h2;
            ctx.drawImage(img, 0, 0, w2, h2);
            s = cnv.toDataURL('image/jpeg');
            img.src = s;

            var head = 'data:image/jpeg;base64,';
            var imgFileSize = Math.round((img.src.length - head.length) * 3 / 4);
            $('#upi_' + name).val(file.name + '|-|' + cnv.toDataURL('image/jpeg'));
            $('#upfs_' + name).html('(<span class="upfd" id="upfm_' + name + '">' + getSizeMb(imgFileSize) + '</span>Mb)');
            return;
          }
        }

        $('#upfw_' + name).val(w);
        $('#upfh_' + name).val(h);
        $('#upfx_' + name).html('(' + w + 'px por ' + h + 'px)');

        if (oJq.attr('data-w') && oJq.attr('data-w') != w) return setErrImgSize(name, w, oJq.attr('data-w'), 'ancho');
        if (oJq.attr('data-h') && oJq.attr('data-h') != h) return setErrImgSize(name, h, oJq.attr('data-h'), 'alto');
        if (oJq.attr('data-wMax') && oJq.attr('data-wMax') < w) return setErrImgSize(name, w, oJq.attr('data-wMax'), 'ancho máximo');
        if (oJq.attr('data-hMax') && oJq.attr('data-hMax') < h) return setErrImgSize(name, h, oJq.attr('data-hMax'), 'alto máximo');

        $('#upfp_' + name).html('<img src="' + s + '" class="imgPrv" />');
        if (typeof callback_img === "function") callback_img(name, file, r);
        window.URL.revokeObjectURL(img.src);
      });
      img.src = r.result;
    }

  }
  r.readAsDataURL(file);

  $('#upfw_' + name).val();
  $('#upfh_' + name).val();
  $('#upfx_' + name).html('&nbsp;');
  $('#upfp_' + name).html(gbl_imgPrv);
  $('#upfn_' + name).html('Cargando archivo...');
  $('#upfs_' + name).html('');
  fjz_clrErrAll();
}

function setErrImgSize(name, val, req, txt) {
  var str = '';
  str += '<div class="mt15 fs12 lh22 red">';
  str += 'El ' + txt + ' de la imagen no es correcto.<br /><br />';
  str += 'Debe ser de ' + req + 'px<br />y la seleccionada es de ' + val + 'px';
  str += '</div>';
  $('#upfx_' + name).html('&nbsp;');
  $('#upfp_' + name).html(str);
}

function setCal(oJq) {
  var name = getName_oJq(oJq);
  if ($(oJq).hasClass('setted')) return;
  oJq.parent().addClass('rel').append('<div class="divCal" id="divCal_' + name + '"></div>');
  $(oJq).addClass('setted').datepicker({ beforeShow: function (inp, ins) { $('#divCal_' + name).append(ins.dpDiv); } });
}

function setAuc(oJq) {
  var temp, name = getName_oJq(oJq), valKey;
  $(window).on('resize.auc', function () { $('#divAuc_' + name).remove(); });
  oJq.on('keydown.auc', function (e) {
    if (e.which == 13) {
      $('#divAuc_' + name).remove();
      oJq.blur();
    }
    else if (e.keyCode == 38 || e.keyCode == 40) {
      var c = $('.divAucList').length;
      if (c == 0) return;

      var id = $('.divAucList.sel').prop('id'), s;
      var i = id ? id.split('_')[1] : 0;
      if (i == 0) temp = oJq.val();
      if (e.keyCode == 38) { i--; s = 30 * i - 150 - i + 5; if (i < 0) s = 10000; }
      if (e.keyCode == 40) { i++; s = 30 * i - 150 - i + 5; }
      if (i < 0) i = c;
      $('.divAucList').removeClass('sel');
      $('#divAucList_' + i).addClass('sel');
      $('.divAuc').scrollTop(s);

      var h = $('#divAucList_' + i).html();
      if (h) oJq.val(htmlToText(h));
      else oJq.val(temp);
    }
  }).on('keyup.auc', function (e) {
    if (e.which == 38 || e.which == 40) return;
    var c = 0, strList = [], val = oJq.val();
    if (val != '') {
      $.each(gbl_arrObjData[name], function () {
        if (this['val'] != 0 && strContains(this['txt'], val, false))
          strList += '<div class="divAucList" id="divAucList_' + ++c + '">' + this['txt'] + '</div>';
      });
    }
    $('#divAuc_' + name).remove();
    if (c > 0) {
      var str = '';
      var l = (parseInt(oJq.position().left) + 2) + 'px';
      $(oJq).parent().append('<div class="divAuc" id="divAuc_' + name + '">' + strList + '<div>');
      $('#divAuc_' + name).css({ top: getBottom(oJq), left: l, width: getWidth(oJq) });

      $('.divAucList').mousedown(function () { oJq.val(htmlToText($(this).html())); })
        .hover(function () { $('.divAucList').removeClass('sel'); $(this).addClass('sel'); })
    }
  }).on('focus.auc', function () { valKey = $('#aui_' + name).val(); }).on('blur.auc', function (e) {
    var valTxt = oJq.val();
    $('#aui_' + name).val('');
    $('#divAuc_' + name).remove();
    $.each(gbl_arrObjData[name], function () {
      if (this['val'] != 0 && strMatch(this['txt'], valTxt)) {
        $('#auc_' + name).val(this['txt']);
        $('#aui_' + name).val(this['val']);
        return false;
      }
    });
    if ($('#aui_' + name).val() != valKey) $('#aui_' + name).change();
  });
}

function getWidth(oJq) {
  var w = parseInt(oJq.width());
  var pl = parseInt(oJq.css('padding-left'));
  var pr = parseInt(oJq.css('padding-right'));
  var bl = parseInt(oJq.css('border-left-width'));
  var br = parseInt(oJq.css('border-right-width'));
  return w + pl + pr + bl + br + 'px';
}

function getBottom(oJq) {
  var t = parseInt(oJq.position().top);
  var h = parseInt(oJq.height());
  var pt = parseInt(oJq.css('padding-top'));
  var pb = parseInt(oJq.css('padding-bottom'));
  var bt = parseInt(oJq.css('border-top-width'));
  var bb = parseInt(oJq.css('border-bottom-width'));
  return t + h + pt + pb + bt + bb + 'px';
}

function setAucText(name) {
  var val = $('#aui_' + name).val();
  $.each(gbl_arrObjData[name], function () {
    if (strMatch(this['val'], val)) {
      $('#auc_' + name).val(this['txt']);
      return false;
    }
  });
}

/* --- */

function resetForm(oFjz, blnIns, remBlur) {
  if (!oFjz) oFjz = gbl_oFjz;
  if (remBlur) oFjz.s = false;

  $.each(oFjz.fields, function () {
    if (!this.ctrl && !this.parent) {
      var id = fjz_getId(this), ds = false;
      if (this.disab == 'bth') ds = true;
      else if (typeof gbl_action !== 'undefined' && this.disab == gbl_action) ds = true;
      if (this.type == 'chk') $(id).prop('checked', this.def).prop('disabled', ds);
      else if (this.type == 'auc') { $('#aui_' + this.name).val(''); $(id).val(this.def).removeClass('err').prop('disabled', ds); }
      else if (this.type == 'upf') {
        $('#upfn_' + this.name).html(gbl_noFile); $('#upfs_' + this.name).html(''); $('#upfx_' + this.name).html('&nbsp;');
        $('#upi_' + this.name).val(''); $('#upl_' + this.name).removeClass('err');
        $('#upfp_' + this.name).html(gbl_imgPrv);
      }
      else if (this.type == 'upm') {
        $('#upmp_' + this.name + ' span').remove();
        $('#upmp_' + this.name).html(gbl_galImg);
        $('#upi_' + this.name).val(0);
        gbl_arrUpmDel = [];
        gbl_arrUpm = [];
      }
      else $(id).val(this.def).removeClass('err').prop('disabled', ds).change();
      if (this.type == 'txa' && this.cls == 'hte') { tinymce.get('txa_' + this.name).setContent(''); }
      if (oFjz.fld_parent) {
        if (oFjz.fld_parent == this.name) $(id).addClass('ent_parent'); else $(id).addClass('ent_child');
        if (gbl_action == 'ins') {
          if (oFjz.fld_parent != this.name) $(id).prop('disabled', true);
          else $(id).off('change').change(function () { setTimeout(function () { filterByParent(); }, 0); });
        } else if (gbl_action == 'upd' && oFjz.fld_parent == this.name) $(id).prop('disabled', true);
      }
    }
  });
  if (oFjz.focusAtIns == false && blnIns) return;
  if (oFjz.resetFocus != false) {
    if (oFjz.idMsg) clearMsg(oFjz.idMsg);
    setFocus(oFjz);
  }
  if (remBlur) oFjz.s = true;
}

function filterByParent() {
  var par_id = $('.ent_parent').prop('id');
  var par_vt = $('#' + par_id).val();
  var par_tp = par_id.split('_')[0];
  var par_nm = par_id.split('_')[1];
  var par_iv = fjz_getId({ type: par_tp, name: par_nm }, 'val');
  var par_vl = $(par_iv).val();

  if (gbl_action == 'ins') resetForm();
  $('#' + par_id).val(par_vt);
  if (par_vl) {
    $.each($('.ent_child'), function () {
      if ($(this).hasClass('ddl')) {
        var nm = $(this).prop('id').split('_')[1];
        var vl = $(this).val();
        setDdlFromArr(nm, filterArrObj(gbl_arrObjData[nm], par_nm, [0, par_vl]));
        $(this).val(vl);
      }
    });
  }
  $('.ent_child').prop('disabled', par_vl ? false : true);
}

function setFocus(oFjz, init) {
  if (!oFjz) oFjz = gbl_oFjz;
  if (oFjz.resetFocus == false && !init) return;
  $.each(oFjz.fields, function () {
    var id = fjz_getId(this);
    if (this.type != 'hdn' && !this.parent && $(id).is(":visible") && !$(id).prop('disabled')) return focusCaret(id);
  });
}

function setDataFormUpd(obj, oFjz) {
  if (!oFjz) oFjz = gbl_oFjz;
  resetForm(oFjz);
  $.each(oFjz.fields, function () {
    if (!this.ctrl) {
      var id = fjz_getId(this, 'val');
      if (this.type == 'chk') $(id).prop('checked', obj[this.name]);
      else if (this.type != 'upf') { $(id).val(obj[this.data] ? obj[this.data] : obj[this.name] ? obj[this.name] : this.def); if (!this.parent) $(id).change(); }
      if (this.type == 'auc') setAucText(this.name);
      if (this.type == 'upf' && this.filPrev) showFilPrev(this);
      if (this.type == 'upf' && this.isImg && this.imgPrev) showImgPrev(this);
      if (this.type == 'txa' && this.cls == 'hte') { tinymce.get('txa_' + this.name).setContent($(id).val()); }
    }
  });
  setFocus(oFjz);
}

function showFilPrev(obj) {
  if (!obj.filName) return;
  var filName = typeof obj.filName === "function" ? obj.filName() : obj.filName; if (!filName) return;
  var name = obj.name; $('#upfn_' + name).html('<a href="' + filName + '?d=' + Date.now() + '" target="_blank" class="lnk">Revisar archivo cargado</a>');
}

function showImgPrev(obj) {
  if (!obj.imgName) return;
  var imgName = typeof obj.imgName === "function" ? obj.imgName() : obj.imgName;
  var name = obj.name;
  if ($('#upf_' + name).attr('data-img-prev') != 'true') return;
  $('#upfp_' + name).html(gbl_imgPrv);
  $('#upfx_' + name).html('Cargando imagen...');
  var img = $('<img src="' + imgName + '?d=' + Date.now() + '" class="imgPrv" />');
  img.on('error', function (e) {
    $('#upfx_' + name).html('No hay imagen');
  }).on('load', function (e) {
    $('#upfx_' + name).html('Imagen actual:');
    $('#upfp_' + name).html(img);
  });
}

/* --- */

function setDdlFromArr(name, arrObj, val) {
  var str = '';
  $.each(arrObj, function () {
    var dis = this.dis ? ' disabled="true"' : '';
    str += '<option value="' + this.val + '"' + dis + '>' + this.txt + '</option>';
  });
  $('#ddl_' + name + ' option').remove();
  $('#ddl_' + name).html(str).prop('disabled', false);
  if (val) $('#ddl_' + name).val(val);
}

function setDdlFromArrBySel(sel, arrObj) {
  var str = '';
  $.each(arrObj, function () { str += '<option value="' + this.val + '">' + this.txt + '</option>'; });
  $(sel + ' option').remove();
  $(sel).html(str).prop('disabled', false);
}

function setDdlFromArrWithCat(name, arrObj) {
  var str = '';
  var cat = '';
  var strCat = '';
  $.each(arrObj, function () {
    if (cat != this.cat) {
      if (cat != '') strCat = '</optgroup>';
      cat = this.cat; strCat += '<optgroup label="' + cat + '">';
    }
    str += strCat + '<option value="' + this.val + '">' + this.txt + '</option>';
    strCat = '';
  });
  str += '</optgroup>';
  $('#ddl_' + name + ' option').remove();
  $('#ddl_' + name).html(str);
}

/* --- */

var gbl_noFile = 'Ningún archivo seleccionado';
var gbl_imgPrv = '<br /><br />Vista Previa Imagen';
var gbl_galImg = '<span class="cols col_100 msgGal"><br /><br />GALERÍA DE IMÁGENES</span>';
var gbl_strErr = 'Se ha producido un error. Inténtalo nuevamente.<br />Si el problema persiste, contacta al administrador.';

//Caret Plugin Included:
(function (k, e, i, j) { k.fn.caret = function (b, l) { var a, c, f = this[0], d = (/*@cc_on!@*/false || !!document.documentMode); if (typeof b === "object" && typeof b.start === "number" && typeof b.end === "number") { a = b.start; c = b.end } else if (typeof b === "number" && typeof l === "number") { a = b; c = l } else if (typeof b === "string") if ((a = f.value.indexOf(b)) > -1) c = a + b[e]; else a = null; else if (Object.prototype.toString.call(b) === "[object RegExp]") { b = b.exec(f.value); if (b != null) { a = b.index; c = a + b[0][e] } } if (typeof a != "undefined") { if (d) { d = this[0].createTextRange(); d.collapse(true); d.moveStart("character", a); d.moveEnd("character", c - a); d.select() } else { this[0].selectionStart = a; this[0].selectionEnd = c } this[0].focus(); return this } else { if (d) { c = document.selection; if (this[0].tagName.toLowerCase() != "textarea") { d = this.val(); a = c[i]()[j](); a.moveEnd("character", d[e]); var g = a.text == "" ? d[e] : d.lastIndexOf(a.text); a = c[i]()[j](); a.moveStart("character", -d[e]); var h = a.text[e] } else { a = c[i](); c = a[j](); c.moveToElementText(this[0]); c.setEndPoint("EndToEnd", a); g = c.text[e] - a.text[e]; h = g + a.text[e] } } else { g = f.selectionStart; h = f.selectionEnd } a = f.value.substring(g, h); return { start: g, end: h, text: a, replace: function (m) { return f.value.substring(0, g) + m + f.value.substring(h, f.value[e]) } } } } })(jQuery, "length", "createRange", "duplicate");