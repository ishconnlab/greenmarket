import { money } from "./format.js";

const paymentLabels = {
  momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  bank_of_kigali: "Bank of Kigali",
  not_recorded: "Not recorded",
};

const pdfMoney = (amount) => money(amount).replace(/\u00a0/g, " ");
const orderStatusLabel = (status) => status?.charAt(0).toUpperCase() + status?.slice(1);
const orderCode = (order) => order._id.slice(-6).toUpperCase();
const orderDate = (value) => new Date(value).toLocaleString();

function addPageNumbers(document) {
  const pageCount = document.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page);
    document.setFontSize(8);
    document.setTextColor(120, 130, 122);
    document.text(
      `Green Market · Page ${page} of ${pageCount}`,
      document.internal.pageSize.getWidth() / 2,
      document.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }
}

export async function downloadOrderReceipt(order) {
  const [{ jsPDF }, { default: QRCode }] = await Promise.all([
    import("jspdf"),
    import("qrcode"),
  ]);
  const document = new jsPDF();
  const qrCode = await QRCode.toDataURL(
    `${window.location.origin}/orders?order=${encodeURIComponent(order._id)}`,
    { margin: 1, width: 240 }
  );
  const pageWidth = document.internal.pageSize.getWidth();

  document.setTextColor(39, 67, 49);
  document.setFontSize(22);
  document.text("Green Market", 16, 20);
  document.setTextColor(90, 103, 93);
  document.setFontSize(10);
  document.text("ORDER RECEIPT", 16, 28);
  document.addImage(qrCode, "PNG", pageWidth - 42, 12, 26, 26);
  document.setDrawColor(220, 226, 218);
  document.line(16, 37, pageWidth - 16, 37);

  document.setTextColor(48, 63, 52);
  document.setFontSize(10);
  document.text(`Order: ${orderCode(order)}`, 16, 48);
  document.text(`Placed: ${orderDate(order.createdAt)}`, 16, 56);
  document.text(`Status: ${orderStatusLabel(order.status)}`, 16, 64);
  document.text(
    `Payment method: ${paymentLabels[order.paymentMethod] || "Not recorded"}${order.paymentAccount ? ` · ${order.paymentAccount}` : ""}`,
    16,
    72
  );
  document.text(
    `Payment confirmation: ${order.paymentStatus === "paid"
      ? `Paid${order.paymentConfirmedAt ? ` on ${orderDate(order.paymentConfirmedAt)}` : ""}`
      : "Awaiting confirmation"}`,
    16,
    80
  );
  const addressLines = document.splitTextToSize(`Delivery address: ${order.address || "Not recorded"}`, pageWidth - 32);
  document.text(addressLines, 16, 88);

  let y = 88 + addressLines.length * 5 + 9;
  document.setFontSize(9);
  document.setTextColor(75, 87, 77);
  document.text("ITEM", 16, y);
  document.text("QTY", pageWidth - 65, y, { align: "right" });
  document.text("UNIT PRICE", pageWidth - 42, y, { align: "right" });
  document.text("TOTAL", pageWidth - 16, y, { align: "right" });
  y += 4;
  document.line(16, y, pageWidth - 16, y);
  y += 7;

  for (const item of order.items) {
    if (y > document.internal.pageSize.getHeight() - 28) {
      document.addPage();
      y = 20;
    }
    document.setTextColor(56, 67, 58);
    document.setFontSize(9);
    const nameLines = document.splitTextToSize(
      item.product?.name || item.productName || "Removed product",
      pageWidth - 112
    );
    document.text(nameLines, 16, y);
    document.text(String(item.quantity), pageWidth - 65, y, { align: "right" });
    document.text(pdfMoney(item.price), pageWidth - 42, y, { align: "right" });
    document.text(pdfMoney(item.price * item.quantity), pageWidth - 16, y, { align: "right" });
    y += Math.max(8, nameLines.length * 5 + 3);
  }

  if (y > document.internal.pageSize.getHeight() - 32) {
    document.addPage();
    y = 20;
  }
  document.line(16, y, pageWidth - 16, y);
  document.setFontSize(12);
  document.setTextColor(39, 67, 49);
  document.text("Order total", pageWidth - 70, y + 10);
  document.text(pdfMoney(order.total), pageWidth - 16, y + 10, { align: "right" });
  document.setFontSize(8);
  document.setTextColor(105, 115, 107);
  document.text("Scan the QR code to open your order history.", 16, y + 20);

  addPageNumbers(document);
  document.save(`green-market-order-${orderCode(order)}.pdf`);
}

export async function downloadAdminOrderReport(orders, { startDate, endDate, status }) {
  const [{ jsPDF }, { default: QRCode }] = await Promise.all([
    import("jspdf"),
    import("qrcode"),
  ]);
  const document = new jsPDF({ orientation: "landscape" });
  const qrCode = await QRCode.toDataURL(`${window.location.origin}/admin`, {
    margin: 1,
    width: 240,
  });
  const pageWidth = document.internal.pageSize.getWidth();
  const generated = new Date().toLocaleString();
  const paidTotal = orders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.total, 0);
  const orderTotal = orders.reduce((sum, order) => sum + order.total, 0);

  document.setTextColor(39, 67, 49);
  document.setFontSize(20);
  document.text("Green Market · Order Report", 14, 18);
  document.addImage(qrCode, "PNG", pageWidth - 34, 8, 22, 22);
  document.setFontSize(9);
  document.setTextColor(88, 102, 92);
  document.text(`Generated: ${generated}`, 14, 26);
  document.text(
    `Period: ${startDate || "All dates"} to ${endDate || "Present"} · Status: ${status === "all" ? "All statuses" : orderStatusLabel(status)}`,
    14,
    32
  );
  document.text(
    `Orders: ${orders.length}   Order value: ${pdfMoney(orderTotal)}   Confirmed paid: ${pdfMoney(paidTotal)}`,
    14,
    39
  );

  let y = 49;
  const columns = [
    { title: "ORDER / DATE", x: 14, width: 45 },
    { title: "CUSTOMER", x: 61, width: 48 },
    { title: "ITEMS", x: 111, width: 68 },
    { title: "STATUS", x: 181, width: 30 },
    { title: "PAYMENT", x: 213, width: 43 },
    { title: "TOTAL", x: 258, width: 25 },
  ];

  function drawHeader() {
    document.setFillColor(238, 243, 237);
    document.rect(12, y - 6, pageWidth - 24, 10, "F");
    document.setFontSize(8);
    document.setTextColor(49, 71, 54);
    columns.forEach((column) => document.text(column.title, column.x, y));
    y += 10;
  }

  drawHeader();
  document.setFontSize(7.5);
  document.setTextColor(58, 68, 60);
  for (const order of orders) {
    const items = order.items
      .map((item) => `${item.product?.name || item.productName || "Removed product"} × ${item.quantity}`)
      .join(", ");
    const values = [
      `#${orderCode(order)}\n${new Date(order.createdAt).toLocaleDateString()}`,
      [order.user?.name || "Unavailable", order.user?.email].filter(Boolean).join("\n"),
      items,
      orderStatusLabel(order.status),
      `${paymentLabels[order.paymentMethod] || "Not recorded"}\n${order.paymentStatus === "paid"
        ? `Paid${order.paymentConfirmedAt ? ` ${new Date(order.paymentConfirmedAt).toLocaleString()}` : ""}`
        : "Awaiting confirmation"}`,
      pdfMoney(order.total),
    ];
    const cellLines = values.map((value, index) =>
      document.splitTextToSize(value, columns[index].width)
    );
    const rowHeight = Math.max(9, ...cellLines.map((lines) => lines.length * 3.5 + 2));
    if (y + rowHeight > document.internal.pageSize.getHeight() - 15) {
      document.addPage();
      y = 18;
      drawHeader();
      document.setFontSize(7.5);
      document.setTextColor(58, 68, 60);
    }
    cellLines.forEach((lines, index) => document.text(lines, columns[index].x, y));
    y += rowHeight;
    document.setDrawColor(231, 235, 230);
    document.line(12, y - 2, pageWidth - 12, y - 2);
  }

  addPageNumbers(document);
  const dateStamp = new Date().toISOString().slice(0, 10);
  document.save(`green-market-order-report-${dateStamp}.pdf`);
}
