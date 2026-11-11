import qrcode from 'qrcode-generator';

export function qrSvg(url) {
  const code = qrcode(0, 'M');
  code.addData(url);
  code.make();
  // Four blank modules around the code keep screen and print copies scannable.
  return code.createSvgTag({cellSize: 4, margin: 16, scalable: true});
}
