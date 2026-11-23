/* ---------- Ordenar el Drive: todo lo del sitio dentro de UNA carpeta (solo mueve; nunca borra ni copia) ---------- */

var NOMBRE_CARPETA_SISTEMA = 'Rockerio Producciones cl';
var PREFIJOS_SISTEMA = /^(Rockerío ·|Respaldo \d|Instantánea |Previo a restaurar )/;

/** La carpeta principal si ya se organizó (o null). Los archivos nuevos se crean ahí; antes de organizar, todo sigue como siempre. */
function carpetaSistema_() {
  var id = PropertiesService.getScriptProperties().getProperty('DRIVE_CARPETA_ID');
  if (!id) return null;
  try { var c = DriveApp.getFolderById(id); return c.isTrashed && c.isTrashed() ? null : c; } catch (e) { return null; }
}

/** Crea una carpeta dentro de la carpeta principal (si existe) o en la raíz (como antes). */
function crearCarpeta_(nombre) {
  var p = carpetaSistema_();
  return p ? p.createFolder(nombre) : DriveApp.createFolder(nombre);
}

/** Lo que se movería: la hoja de datos y las carpetas/archivos «Rockerío · …» y respaldos que están sueltos en la raíz. */
function pendientesDeMover_() {
  var props = PropertiesService.getScriptProperties(), principal = carpetaSistema_(), idPrincipal = principal ? principal.getId() : '', out = [], vistos = {};
  function agregar(tipo, o) { var id = o.getId(); if (id === idPrincipal || vistos[id]) return; vistos[id] = 1; out.push({ tipo: tipo, nombre: o.getName(), id: id, obj: o }); }
  var sid = props.getProperty('SHEET_ID');
  if (sid) { try { var hoja = DriveApp.getFileById(sid); var enPrincipal = false; if (principal) { var ps = hoja.getParents(); while (ps.hasNext()) if (ps.next().getId() === idPrincipal) enPrincipal = true; } if (!enPrincipal) agregar('Hoja de datos', hoja); } catch (e) { /* sin acceso: se omite */ } }
  var raiz = DriveApp.getRootFolder(), fs = raiz.getFolders(), fl = raiz.getFiles();
  while (fs.hasNext()) { var f = fs.next(); if (PREFIJOS_SISTEMA.test(f.getName())) agregar('Carpeta', f); }
  while (fl.hasNext()) { var a = fl.next(); if (PREFIJOS_SISTEMA.test(a.getName())) agregar('Archivo', a); }
  return out;
}

/** Solo muestra qué se movería. No cambia nada. */
function adminDriveVistaPrevia() {
  exigirAdmin_();
  var lista = pendientesDeMover_();
  return { carpeta: NOMBRE_CARPETA_SISTEMA, existe: !!carpetaSistema_(), items: lista.map(function (x) { return x.tipo + ': ' + x.nombre; }) };
}

/** Mueve (no copia ni borra) lo del sitio a la carpeta principal. Los enlaces y permisos no cambian porque los archivos conservan su identidad. */
function adminDriveOrganizar() {
  exigirAdmin_();
  return conBloqueo_(function () {
    var props = PropertiesService.getScriptProperties(), carpeta = carpetaSistema_();
    if (!carpeta) { // reutiliza una carpeta con ese nombre si ya existía en la raíz
      var it = DriveApp.getRootFolder().getFoldersByName(NOMBRE_CARPETA_SISTEMA);
      carpeta = it.hasNext() ? it.next() : DriveApp.createFolder(NOMBRE_CARPETA_SISTEMA);
      props.setProperty('DRIVE_CARPETA_ID', carpeta.getId());
    }
    var lista = pendientesDeMover_(), movidos = 0, fallos = [];
    lista.forEach(function (x) { try { x.obj.moveTo(carpeta); movidos++; } catch (e) { fallos.push(x.nombre); } });
    return { ok: true, carpeta: carpeta.getName(), url: carpeta.getUrl(), movidos: movidos, fallos: fallos };
  });
}
