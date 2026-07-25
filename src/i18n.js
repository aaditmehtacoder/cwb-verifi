/**
 * The parent screen in four languages.
 *
 * A parent reading this is frightened and may not read English. Translating the
 * handful of lines they actually see is not a nicety, it is the difference
 * between understanding and panic, so the strings are carried in full rather
 * than machine translated at runtime where a network failure would strand them.
 */

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'zh', label: '中文' },
];

const STRINGS = {
  en: {
    yourStudent: 'Your student',
    inProgress: 'Verification in progress',
    waitingBody:
      'Staff are checking every location. You will see an update the moment a person confirms {name}.',
    lastUpdated: 'Last updated {n} seconds ago',
    happeningTitle: 'What is happening now',
    happeningBody:
      'Every classroom reports to one board. A staff member has to see your child before anything here changes.',
    verified: '{name} has been verified safe by school staff.',
    confirmedBy: 'Confirmed by {who}{when}',
    locationNote: 'Her location is not shown. This protects every student during an active event.',
    nextTitle: 'Next',
    nextBody: 'Stay where you are. When reunification opens you will get the location and a pass here.',
    pickup: 'Pickup location',
    queue: 'Queue',
    wait: 'Estimated wait',
    pass: 'Guardian pass',
    passNote: 'Show this at the Gate B desk. Only adults on the authorized list can collect {name}.',
    trust: 'Verifi will never ask you for payment, a Social Security number, or your location.',
    checkInTitle: 'Picking up early?',
    checkInBody:
      'Tell the school you are on your way. Staff still confirm your child in person before release.',
    checkInAction: 'I am on my way to collect {name}',
    checkedIn: 'The school knows you are coming.',
    checkedInBody: 'Go to Gate B. Bring photo ID. Staff will confirm {name} with you there.',
    language: 'Language',
    released: '{name} has been released to you.',
    releasedBody: 'Handed over by {who}{when} at Gate B. Nothing further is needed here.',
    passCode: 'Pass code',
    passSpoken: 'If the scanner will not read the screen, read these six digits to the staff member.',
  },
  es: {
    yourStudent: 'Su estudiante',
    inProgress: 'Verificación en curso',
    waitingBody:
      'El personal está revisando cada lugar. Verá una actualización en cuanto una persona confirme a {name}.',
    lastUpdated: 'Actualizado hace {n} segundos',
    happeningTitle: 'Qué está pasando ahora',
    happeningBody:
      'Cada aula reporta a un solo tablero. Un miembro del personal debe ver a su hijo antes de que algo cambie aquí.',
    verified: 'El personal escolar ha verificado que {name} está a salvo.',
    confirmedBy: 'Confirmado por {who}{when}',
    locationNote: 'No se muestra su ubicación. Esto protege a cada estudiante durante un evento activo.',
    nextTitle: 'Siguiente',
    nextBody:
      'Quédese donde está. Cuando abra la reunificación recibirá aquí el lugar y un pase.',
    pickup: 'Lugar de recogida',
    queue: 'Fila',
    wait: 'Espera estimada',
    pass: 'Pase de tutor',
    passNote:
      'Muestre esto en la puerta B. Solo los adultos en la lista autorizada pueden recoger a {name}.',
    trust: 'Verifi nunca le pedirá pago, número de Seguro Social ni su ubicación.',
    checkInTitle: '¿Recoge temprano?',
    checkInBody:
      'Avise a la escuela que viene en camino. El personal confirma a su hijo en persona antes de entregarlo.',
    checkInAction: 'Voy en camino a recoger a {name}',
    checkedIn: 'La escuela sabe que viene.',
    checkedInBody: 'Vaya a la puerta B. Traiga identificación. El personal confirmará a {name} allí.',
    language: 'Idioma',
    released: '{name} ha sido entregado a usted.',
    releasedBody: 'Entregado por {who}{when} en la puerta B. No hace falta nada más aquí.',
    passCode: 'Código del pase',
    passSpoken: 'Si el lector no puede leer la pantalla, lea estos seis dígitos al personal.',
  },
  vi: {
    yourStudent: 'Học sinh của bạn',
    inProgress: 'Đang xác minh',
    waitingBody:
      'Nhân viên đang kiểm tra từng vị trí. Bạn sẽ thấy cập nhật ngay khi có người xác nhận {name}.',
    lastUpdated: 'Cập nhật {n} giây trước',
    happeningTitle: 'Điều gì đang diễn ra',
    happeningBody:
      'Mọi lớp học đều báo về một bảng chung. Một nhân viên phải nhìn thấy con bạn trước khi có bất kỳ thay đổi nào ở đây.',
    verified: 'Nhân viên nhà trường đã xác nhận {name} an toàn.',
    confirmedBy: 'Được xác nhận bởi {who}{when}',
    locationNote:
      'Vị trí của em không được hiển thị. Điều này bảo vệ mọi học sinh trong lúc sự việc đang diễn ra.',
    nextTitle: 'Tiếp theo',
    nextBody: 'Hãy ở nguyên vị trí. Khi mở đoàn tụ, bạn sẽ nhận được địa điểm và thẻ tại đây.',
    pickup: 'Địa điểm đón',
    queue: 'Hàng đợi',
    wait: 'Thời gian chờ dự kiến',
    pass: 'Thẻ người giám hộ',
    passNote:
      'Xuất trình thẻ này tại bàn Cổng B. Chỉ người lớn trong danh sách được phép mới có thể đón {name}.',
    trust: 'Verifi sẽ không bao giờ hỏi bạn về thanh toán, số An sinh Xã hội hay vị trí của bạn.',
    checkInTitle: 'Đón sớm?',
    checkInBody:
      'Hãy báo cho nhà trường biết bạn đang tới. Nhân viên vẫn xác nhận con bạn trực tiếp trước khi bàn giao.',
    checkInAction: 'Tôi đang trên đường đến đón {name}',
    checkedIn: 'Nhà trường biết bạn đang tới.',
    checkedInBody: 'Hãy đến Cổng B. Mang theo giấy tờ tùy thân. Nhân viên sẽ xác nhận {name} ở đó.',
    language: 'Ngôn ngữ',
    released: '{name} đã được bàn giao cho bạn.',
    releasedBody: 'Do {who} bàn giao{when} tại Cổng B. Không cần làm gì thêm ở đây.',
    passCode: 'Mã thẻ',
    passSpoken: 'Nếu máy quét không đọc được màn hình, hãy đọc sáu chữ số này cho nhân viên.',
  },
  zh: {
    yourStudent: '您的学生',
    inProgress: '正在核实',
    waitingBody: '工作人员正在检查每个位置。一旦有人确认 {name}，您会立即看到更新。',
    lastUpdated: '{n} 秒前更新',
    happeningTitle: '目前的情况',
    happeningBody: '每间教室都向同一块看板汇报。工作人员必须亲眼看到您的孩子，这里才会有任何变化。',
    verified: '学校工作人员已确认 {name} 安全。',
    confirmedBy: '由 {who} 确认{when}',
    locationNote: '不显示她的位置。这是为了在事件进行期间保护每一位学生。',
    nextTitle: '下一步',
    nextBody: '请留在原地。团聚开放后，您会在这里收到地点和通行证。',
    pickup: '接送地点',
    queue: '队列',
    wait: '预计等待',
    pass: '监护人通行证',
    passNote: '请在 B 门服务台出示。只有授权名单上的成年人才能接走 {name}。',
    trust: 'Verifi 绝不会向您索要付款、社会安全号码或您的位置。',
    checkInTitle: '提前接走？',
    checkInBody: '告诉学校您正在赶来。工作人员仍会在交接前当面确认您的孩子。',
    checkInAction: '我正在前往接 {name}',
    checkedIn: '学校已知道您正在赶来。',
    checkedInBody: '请前往 B 门，携带带照片的证件。工作人员会在那里与您确认 {name}。',
    language: '语言',
    released: '{name} 已交由您接走。',
    releasedBody: '由 {who} 在 B 门交接{when}。这里无需再做任何事。',
    passCode: '通行码',
    passSpoken: '如果扫描器读不出屏幕，请把这六位数字念给工作人员。',
  },
};

export function translator(code) {
  const table = STRINGS[code] || STRINGS.en;
  return (key, vars = {}) => {
    let out = table[key] ?? STRINGS.en[key] ?? key;
    Object.entries(vars).forEach(([k, v]) => {
      out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    });
    return out;
  };
}
