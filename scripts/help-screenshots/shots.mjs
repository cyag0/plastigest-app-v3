/**
 * Recorridos que generan las capturas de cada tema de la ayuda.
 *
 * Cada tema tiene un `run(h)` que navega la app como lo haría el usuario y
 * llama `h.shot(nombre, page, { marks })` en cada pantalla a documentar. La
 * captura queda en assets/help/<tema>/<nombre>.webp y se usa en el contenido
 * como `{ type: "image", image: "<tema>/<nombre>" }`.
 *
 * Usa los usuarios demo (DemoDataSeeder). Si un recorrido crea datos, los
 * deshace al final para no ensuciar la base local.
 */

export const USERS = {
  // Pide productos (sucursal destino).
  laLija: { email: "encargado.lalija@cocos-francisco.com" },
  // Surte (sucursal de origen).
  matriz: { email: "encargado.matriz@cocos-francisco.com" },
};

const TRANSFERS = "/auth/admin/inventory-transfers";

/** El contenedor más chico que tiene a `a` y a `b` (ej. etiqueta + input). */
function innermost(page, a, b) {
  return page.locator("div").filter({ has: a }).filter({ has: b }).last();
}

const transferencias = {
  id: "transferencias",
  async run(h) {
    const pide = await h.page("laLija");
    const surte = await h.page("matriz");
    const apiPide = await h.api("laLija");
    const apiSurte = await h.api("matriz");
    let transferId = null;

    try {
      // Menú del módulo.
      await h.goto(pide, "/home/transfers-menu");
      await pide.getByText("Nueva Transferencia").waitFor();
      await h.shot("menu", pide, {
        marks: [{ locator: pide.getByText("Nueva Transferencia"), label: "1" }],
      });

      // Nueva solicitud: elegir de qué sucursal se pide.
      await h.goto(pide, "/home/transfers/formv2");
      await pide.getByText("Elegir sucursal").first().click();
      // En web angosta el menú queda en parte fuera de la pantalla: se dispara el
      // click (RN-web llama onPress desde ese evento) en vez de hacer clic.
      await pide.getByText(apiSurte.location.name).first().dispatchEvent("click");
      // Dos productos con existencia en la sucursal de origen, para que la
      // solicitud se pueda crear (el catálogo también lista algunos en 0).
      const catalog = await apiPide.get(`/auth/admin/sales/initial-data?location_id=${apiSurte.location.id}`);
      const stocked = (catalog.data?.products ?? [])
        .filter((product) => {
          const stock = product.locations?.find((l) => l.id === apiSurte.location.id)?.pivot?.current_stock;
          return Number(stock) >= 10;
        })
        .slice(0, 2);
      if (stocked.length < 2) throw new Error("No hay dos productos con existencia en la sucursal de origen");

      const buscar = pide.getByPlaceholder("Buscar productos o escanear código");
      // Busca el producto y devuelve el botón Agregar de su tarjeta. Se espera
      // a que el buscador (con debounce) deje solo esa tarjeta: un clic antes
      // le caería al primer producto de la lista anterior.
      const findProduct = async (name) => {
        await buscar.fill(name);
        const title = pide.getByText(name, { exact: true });
        await title.waitFor();
        await pide.waitForTimeout(700);
        const card = innermost(pide, title, pide.getByText("Agregar", { exact: true }));
        return card.getByText("Agregar", { exact: true }).locator("..");
      };

      let agregar = await findProduct(stocked[0].name);
      await h.debug(pide, "nueva");
      await h.shot("nueva", pide, {
        marks: [
          { locator: pide.getByText("Pedir a").locator(".."), label: "2" },
          { locator: buscar.locator(".."), label: "3" },
          { locator: agregar, label: "3" },
        ],
      });

      // Carrito con los dos productos.
      await agregar.click();
      agregar = await findProduct(stocked[1].name);
      await agregar.click();
      await buscar.fill("");
      await pide.getByLabel("Ver carrito").click();
      const crear = pide.getByRole("button", { name: "Crear Solicitud de Transferencia" });
      await crear.waitFor();
      await h.debug(pide, "carrito");
      await h.shot("carrito", pide, { marks: [{ locator: crear, label: "5" }] });

      // Crear la solicitud; la app lleva a Solicitudes Pendientes.
      await crear.click();
      await pide.waitForTimeout(800);
      await h.debug(pide, "confirmar");
      await pide.getByRole("button", { name: "Crear Solicitud", exact: true }).click();
      await pide.waitForURL(/\/home\/transfers\/pending/);
      const pending = await apiPide.get(
        `${TRANSFERS}?status=pending&from_location_id=${apiSurte.location.id}` +
          `&to_location_id=${apiPide.location.id}&per_page=50&paginated=true`,
      );
      const created = (pending.data ?? []).reduce((a, b) => (b.id > (a?.id ?? 0) ? b : a), null);
      if (!created) throw new Error("No se encontró la solicitud recién creada");
      transferId = created.id;

      await pide.getByText(created.transfer_number).first().waitFor();
      await h.debug(pide, "pendientes");
      await h.shot("pendientes", pide, { marks: [pide.getByText(created.transfer_number).first()] });

      // Paso 1: la sucursal de origen aprueba.
      await h.goto(surte, `/home/transfers/${transferId}`);
      const aceptar = surte.getByRole("button", { name: "Aceptar" });
      await aceptar.waitFor();
      await h.debug(surte, "aprobar");
      await h.shot("aprobar", surte, {
        marks: [
          { locator: innermost(surte, surte.getByText("Cantidad a enviar").first(), surte.locator("input")), label: "2" },
          { locator: aceptar, label: "3" },
          { locator: surte.getByRole("button", { name: "Rechazar" }), label: "3" },
        ],
      });
      await aceptar.click();
      await surte.getByText("Aprobar", { exact: true }).click();

      // Paso 2: envío con fotos del transporte.
      const transferir = surte.getByRole("button", { name: "Transferir productos" });
      await transferir.waitFor();
      // El aviso "Transferencia aprobada" tapa el botón de enviar.
      await surte.getByText("Cerrar", { exact: true }).click().catch(() => {});
      await h.debug(surte, "enviar");
      await h.shot("enviar", surte, {
        marks: [
          {
            locator: innermost(surte, surte.getByText("Subir fotos del transporte (obligatorio)"), surte.getByText("Galería")),
            label: "2",
          },
          { locator: transferir, label: "3" },
        ],
      });

      // El envío se hace por API: subir la foto desde la interfaz abre el
      // selector de archivos del sistema.
      const approved = (await apiSurte.get(`${TRANSFERS}/${transferId}`)).data;
      const photo = await surte.screenshot({ clip: { x: 0, y: 0, width: 200, height: 200 } });
      const form = new FormData();
      approved.details.forEach((detail, i) => {
        form.append(`items[${i}][detail_id]`, String(detail.id));
        form.append(`items[${i}][quantity_shipped]`, String(detail.quantity_requested));
      });
      form.append("evidence[0]", new Blob([photo], { type: "image/png" }), "transporte.png");
      await apiSurte.post(`${TRANSFERS}/${transferId}/ship`, form);

      // Paso 3: la sucursal destino recibe.
      await h.goto(pide, `/home/transfers/${transferId}`);
      const si = pide.getByText("Si", { exact: true });
      await si.first().waitFor();
      await h.debug(pide, "recibir");
      await h.shot("recibir", pide, {
        marks: [{ locator: pide.getByText("Llego correctamente?").first().locator(".."), label: "1" }],
      });

      // Recepción con faltante en el primer producto.
      await pide.getByText("No", { exact: true }).first().click();
      const motivo = pide.getByText("Motivo del ajuste").first();
      await motivo.waitFor();
      await pide.getByText("Daño", { exact: true }).first().click();
      await innermost(pide, pide.getByText("Que paso?").first(), pide.locator("input, textarea"))
        .locator("input, textarea")
        .first()
        .fill("La botella llegó rota");
      await h.debug(pide, "diferencias");
      await h.shot("diferencias", pide, { marks: [motivo.locator("..")] });

      // Resumen: una transferencia ya completada, de preferencia con diferencias.
      // Se omiten las de sucursales de prueba (QA).
      const completed = (
        await apiPide.get(`${TRANSFERS}?status=completed&per_page=50&paginated=true`)
      ).data.filter((t) => ![t.from_location?.name, t.to_location?.name].some((n) => /QA/i.test(n ?? "")));
      const summary =
        completed.find((t) =>
          t.details?.some((d) => Number(d.quantity_received) < Number(d.quantity_shipped)),
        ) ?? completed[0];
      await h.goto(pide, `/home/transfers/${summary.id}`);
      await pide.getByText("Línea de tiempo").first().waitFor();
      await h.debug(pide, "resumen");
      await h.shot("resumen", pide);
    } finally {
      // Se cancela la solicitud de prueba: si ya iba en camino, el backend
      // regresa lo enviado al inventario de origen.
      if (transferId) {
        await apiPide.delete(`${TRANSFERS}/${transferId}`).catch((error) =>
          console.warn(`  ! no se pudo cancelar la transferencia ${transferId}: ${error.message}`),
        );
      }
    }
  },
};

export const topics = [transferencias];
