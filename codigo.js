function doGet() {
    return HtmlService.createTemplateFromFile('Index')
        .evaluate()
        .setTitle('BEX - Panel Móvil de Incentivos')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function obtenerDatosFormatocelular() {
    return procesarBaseDatosBEX("Resumen_BNB");
}

function readData() {
    return procesarBaseDatosBEX("Resumen_Bille");
}

function procesarBaseDatosBEX(nombreHoja) {
    var idHoja = SpreadsheetApp.getActiveSpreadsheet().getId();
    var ss = SpreadsheetApp.openById(idHoja);
    var hoja = ss.getSheetByName(nombreHoja);

    if (!hoja) return [];

    var datosRaw = hoja.getDataRange().getValues();
    if (datosRaw.length <= 1) return [];

    // Mapeamos leyendo tu estructura real: Col 0=Nombre, Col 1=Supervisor, Col 2=Departamento, Col 3=Cuentas
    var matrizLimpia = datosRaw.slice(1).map(function (fila) {
        var nombre = fila[0] ? fila[0].toString().trim() : "";
        var supervisor = fila[1] ? fila[1].toString().trim() : "";
        var ciudad = fila[2] ? fila[2].toString().trim() : "";
        var cuentas = Number(fila[3]) || 0;

        return {
            nombre: nombre,
            supervisor: supervisor,
            ciudad: ciudad,
            cuentas: cuentas
        };
    }).filter(function (item) {
        // Filtro automático anti filas basura o vacías "(En blanco)"
        var nLower = item.nombre.toLowerCase();
        var sLower = item.supervisor.toLowerCase();
        return nLower !== "" && !nLower.includes("en blanco") && sLower !== "" && !sLower.includes("en blanco");
    });

    return matrizLimpia;
}
