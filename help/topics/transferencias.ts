import palette from "@/constants/palette";
import type { HelpTopic } from "../types";

export const transferencias: HelpTopic = {
  id: "transferencias",
  title: "Transferencias",
  summary:
    "Pide productos a otra sucursal y da seguimiento al envío hasta que llegan: aprobación, envío y recepción.",
  icon: "swap-horizontal",
  group: "Inventario",
  permission: "transfers_list",
  moduleRoute: "/(tabs)/home/transfers-menu",
  routes: {
    "/home/transfers-menu": "como-funciona",
    "/home/transfers/formv2": "solicitar",
    "/home/transfers/pending": "seguimiento",
    "/home/transfers/history": "seguimiento",
    // El detalle afina la sección según el paso en el que va (useHelpSection).
    "/home/transfers/[id]": "detalle",
  },
  sections: [
    {
      id: "como-funciona",
      title: "Cómo funciona",
      blocks: [
        {
          type: "p",
          text: "Una transferencia mueve productos de una sucursal a otra. La pide la sucursal que **necesita** los productos y la surte la sucursal que **los tiene**:",
        },
        {
          type: "definitions",
          items: [
            {
              term: "Sucursal que pide (destino)",
              description:
                "Es siempre la sucursal en la que estás al crear la solicitud. Recibe los productos y confirma lo que llegó.",
            },
            {
              term: "Sucursal que surte (origen)",
              description:
                "La eliges al crear la solicitud. Aprueba o rechaza, ajusta cantidades y envía los productos.",
            },
          ],
        },
        {
          type: "flow",
          items: ["Pendiente", "Aprobada", "En tránsito", "Completada"],
          note: "Cada paso lo hace una sucursal distinta y la app le crea una tarea a quien le toca.",
        },
        {
          type: "callout",
          tone: "info",
          text: "El inventario **sale** de la sucursal de origen cuando se envía y **entra** a la de destino cuando se recibe, solo por la cantidad que llegó bien.",
        },
        {
          type: "p",
          text: "Desde **Transferencias** creas una solicitud con **Nueva Transferencia**, das seguimiento en **Solicitudes Pendientes** y consultas las terminadas en **Historial**.",
        },
      ],
    },
    {
      id: "solicitar",
      title: "Pedir productos a otra sucursal",
      blocks: [
        {
          type: "steps",
          items: [
            "En **Transferencias**, toca **Nueva Transferencia**.",
            "En **Pedir a**, toca **Elegir sucursal** y elige la sucursal que te va a surtir.",
            "Busca los productos por nombre o escaneando el código y toca **Agregar**. Solo aparecen los que tienen existencia en esa sucursal.",
            "Abre el carrito (en el celular es el ícono de la barra superior), revisa las cantidades y, si quieres, escribe **Notas**.",
            "Toca **Crear Solicitud de Transferencia** y confirma con **Crear Solicitud**.",
          ],
        },
        {
          type: "gallery",
          images: [
            { image: "transferencias/menu", caption: "1. Nueva Transferencia" },
            { image: "transferencias/nueva", caption: "2 y 3. Elige la sucursal y agrega productos" },
            { image: "transferencias/carrito", caption: "5. Crea la solicitud desde el carrito" },
          ],
        },
        {
          type: "callout",
          tone: "tip",
          text: "No puedes pedir más de lo que hay en la sucursal de origen: la app te avisa con **Stock insuficiente** y te dice cuánto queda disponible.",
        },
        {
          type: "callout",
          tone: "warning",
          text: "Si cambias la sucursal de **Pedir a**, el carrito se vacía.",
        },
        {
          type: "p",
          text: "La solicitud queda **Pendiente** y aparece en **Solicitudes Pendientes**. A la sucursal de origen le llega la tarea **Aprobar transferencia**.",
        },
      ],
    },
    {
      id: "aprobar",
      title: "Aprobar o rechazar una solicitud",
      blocks: [
        {
          type: "p",
          text: "Le toca a la **sucursal de origen**. Abre la transferencia desde **Solicitudes Pendientes** o desde la tarea **Aprobar transferencia**; arriba dice **Te toca aprobarla**.",
        },
        {
          type: "steps",
          items: [
            "Revisa los productos que te pidieron; en cada uno ves cuánto hay en tu sucursal.",
            "Si no puedes surtir todo, cambia la cantidad en **Enviar** (puede ser 0).",
            "Toca **Aprobar** en la barra de abajo y confirma con **Aprobar**. Si no procede, toca **Rechazar** y confirma.",
          ],
        },
        {
          type: "image",
          image: "transferencias/aprobar",
          caption: "2. Cambia la cantidad a enviar · 3. Aprobar o Rechazar",
        },
        {
          type: "callout",
          tone: "info",
          text: "Aprobar todavía no mueve inventario: solo fija cuánto se va a enviar.",
        },
        {
          type: "p",
          text: "Al aprobar, a quien pidió le llega un aviso y tu sucursal recibe la tarea **Enviar transferencia**. Si la rechazas, termina como **Rechazada** y también se le avisa.",
        },
      ],
    },
    {
      id: "enviar",
      title: "Enviar los productos",
      blocks: [
        {
          type: "p",
          text: "También lo hace la **sucursal de origen**, con la transferencia ya **Aprobada**; arriba dice **Te toca enviarla**.",
        },
        {
          type: "steps",
          items: [
            "Prepara los productos: se envía exactamente la cantidad aprobada.",
            "En **Fotos del envío**, sube al menos una foto con **Tomar foto** o **Galería** (en la computadora, **Agregar foto**); hasta 8.",
            "Toca **Enviar productos** y confirma con **Enviar**.",
          ],
        },
        {
          type: "image",
          image: "transferencias/enviar",
          caption: "2. Sube las fotos del envío · 3. Enviar productos",
        },
        {
          type: "callout",
          tone: "warning",
          text: "En este momento el inventario **sale de tu sucursal**. La transferencia queda **En tránsito** y la sucursal destino recibe la tarea **Recibir transferencia**.",
        },
      ],
    },
    {
      id: "recibir",
      title: "Recibir una transferencia",
      blocks: [
        {
          type: "p",
          text: "Le toca a la **sucursal destino** cuando llega la mercancía. Abre la transferencia **En tránsito** desde **Solicitudes Pendientes** o desde la tarea **Recibir transferencia**; arriba dice **Te toca recibirla**.",
        },
        {
          type: "steps",
          items: [
            "En cada producto, **Llegó** ya trae lo que se envió: si llegó completo y en buen estado, no cambies nada.",
            "Si faltó algo o llegó dañado, escribe en **Llegó** lo que sí llegó en buen estado y registra la diferencia como se explica en **Recibir con faltantes o daños**.",
            "Opcional: escribe la **Nota de la recepción** y sube **Fotos de la recepción**.",
            "Toca **Confirmar recepción** y confirma con **Confirmar**.",
          ],
        },
        {
          type: "image",
          image: "transferencias/recibir",
          caption: "1. Revisa cuánto llegó de cada producto",
        },
        {
          type: "p",
          text: "Los productos entran al inventario de tu sucursal y la transferencia queda **Completada**. A quien envió le llega un aviso.",
        },
        {
          type: "links",
          items: [{ label: "Recibir con faltantes o daños", topic: "transferencias", section: "diferencias" }],
        },
      ],
    },
    {
      id: "diferencias",
      title: "Recibir con faltantes o daños",
      blocks: [
        {
          type: "steps",
          items: [
            "En el producto que no llegó bien, escribe en **Llegó** la cantidad que sí llegó en buen estado; debajo ves cuánto falta.",
            "En **Motivo**, elige **Se perdió** o **Llegó dañado**.",
            "Describe lo ocurrido en **¿Qué pasó?**. Si quieres, toca **Agregar nota del ajuste**.",
            "Sube al menos una foto en **Fotos del faltante o daño** (hasta 4).",
            "Toca **Confirmar recepción**: la confirmación dice cuánto llegó de cada producto con diferencia.",
          ],
        },
        {
          type: "image",
          image: "transferencias/diferencias",
          caption: "Datos de un producto que llegó dañado",
        },
        {
          type: "p",
          text: "Solo entra a tu inventario lo que recibiste. La diferencia queda registrada como un ajuste por pérdida o daño, con tu descripción y tus fotos; no regresa a la sucursal de origen.",
        },
        {
          type: "callout",
          tone: "info",
          text: "Alguien de tu sucursal con permiso de inventario recibe la tarea urgente **Revisar diferencias de transferencia**, y a quien envió le llega un aviso de que hubo diferencias.",
        },
      ],
    },
    {
      id: "seguimiento",
      title: "Pendientes e historial",
      blocks: [
        {
          type: "definitions",
          items: [
            {
              term: "Solicitudes Pendientes",
              description:
                "Las transferencias que siguen en proceso: **Pendiente**, **Aprobada** y **En tránsito**. Las que pediste y las que te pidieron.",
            },
            {
              term: "Historial",
              description:
                "Las que ya terminaron: **Completada**, **Rechazada** y **Cancelada**.",
            },
          ],
        },
        {
          type: "list",
          items: [
            "Usa el filtro **Estado** para ver solo las de un estado.",
            "Toca una transferencia para abrir su detalle y ver en qué paso va.",
            "Si no encuentras una transferencia, revisa su último estado para saber en qué lista debe aparecer.",
          ],
        },
        {
          type: "image",
          image: "transferencias/pendientes",
          caption: "Solicitudes Pendientes: la nueva solicitud aparece como Pendiente",
        },
      ],
    },
    {
      id: "detalle",
      title: "El detalle de una transferencia",
      blocks: [
        {
          type: "p",
          text: "Arriba ves de qué sucursal a cuál va, el folio, quién la pidió, el estado y a quién le toca, con los pasos **Solicitud**, **Aprobación**, **Envío** y **Recepción**. Solo la sucursal a la que le toca ve la acción en la barra de abajo; las demás la ven como consulta.",
        },
        {
          type: "p",
          text: "Cada producto dice la cantidad de la etapa en la que va: **Pedido**, **Aprobado**, **Enviado** o **Recibido**. Si llegó incompleto, dice cuánto faltó, el motivo, qué pasó y sus fotos, y con **Ver ajuste** abres el ajuste que se generó. Al lado están las fotos del envío y de la recepción y el **Historial**.",
        },
        {
          type: "p",
          text: "En el menú **⋮** está **Imprimir remisión**: la hoja que viaja con la mercancía.",
        },
        {
          type: "image",
          image: "transferencias/resumen",
          caption: "Una transferencia completada",
        },
        {
          type: "links",
          items: [
            { label: "Aprobar o rechazar una solicitud", topic: "transferencias", section: "aprobar" },
            { label: "Enviar los productos", topic: "transferencias", section: "enviar" },
            { label: "Recibir una transferencia", topic: "transferencias", section: "recibir" },
          ],
        },
      ],
    },
    {
      id: "cancelar",
      title: "Cancelar una transferencia",
      blocks: [
        {
          type: "p",
          text: "Mientras no esté completada (**Pendiente**, **Aprobada** o **En tránsito**), quien la pidió o la sucursal de origen pueden cancelarla, si tienen permiso para cancelar transferencias.",
        },
        {
          type: "steps",
          items: [
            "En **Solicitudes Pendientes**, abre el menú **⋮** de la transferencia (o el **⋮** de arriba en su detalle).",
            "Toca **Cancelar solicitud** (en el detalle, **Cancelar transferencia**) y confirma con **Sí, cancelar**.",
          ],
        },
        {
          type: "callout",
          tone: "info",
          text: "Si ya iba en camino, la mercancía regresa al inventario de la sucursal de origen.",
        },
      ],
    },
    {
      id: "estados",
      title: "Estados de una transferencia",
      blocks: [
        {
          type: "flow",
          items: ["Pendiente", "Aprobada", "En tránsito", "Completada"],
          note: "Si no procede, termina como **Rechazada** o **Cancelada**.",
        },
        {
          type: "definitions",
          items: [
            {
              term: "Pendiente",
              description: "Se creó la solicitud y espera que la sucursal de origen la apruebe o rechace.",
              color: palette.warning,
            },
            {
              term: "Aprobada",
              description: "La sucursal de origen aceptó; falta que envíe los productos.",
              color: palette.info,
            },
            {
              term: "En tránsito",
              description: "Los productos salieron de la sucursal de origen y van en camino.",
              color: palette.primary,
            },
            {
              term: "Completada",
              description: "La sucursal destino registró lo que recibió. El proceso terminó.",
              color: palette.success,
            },
            {
              term: "Rechazada",
              description: "La sucursal de origen no aceptó la solicitud.",
              color: palette.error,
            },
            {
              term: "Cancelada",
              description: "Se anuló antes de completarse.",
              color: palette.textSecondary,
            },
          ],
        },
      ],
    },
    {
      id: "tareas-avisos",
      title: "Tareas y avisos del proceso",
      blocks: [
        {
          type: "p",
          text: "La app crea una tarea en cada paso para la sucursal a la que le toca, y se marca sola como completada al hacer el paso:",
        },
        {
          type: "definitions",
          items: [
            { term: "Aprobar transferencia", description: "Sucursal de origen, al crear la solicitud. Vence en 1 día." },
            { term: "Enviar transferencia", description: "Sucursal de origen, al aprobar. Vence en 2 días." },
            { term: "Recibir transferencia", description: "Sucursal destino, al enviar. Vence en 2 días." },
            {
              term: "Revisar diferencias de transferencia",
              description: "Sucursal destino, si se recibió con faltantes o daños. Es urgente.",
            },
          ],
        },
        {
          type: "p",
          text: "Además llegan avisos: a quien pidió cuando se aprueba, se rechaza o se envía; a quien envió cuando se recibe. Si se rechaza o se cancela, las tareas abiertas se cancelan.",
        },
        {
          type: "links",
          items: [{ label: "Guía de tareas y notificaciones", route: "/(stacks)/task-notification-guide" }],
        },
      ],
    },
  ],
};
