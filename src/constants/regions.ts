export interface Province {
  id: string;
  name: string;
}

export interface City {
  id: string;
  provinceId: string;
  name: string;
}

export const PROVINCES: Province[] = [
  { id: '1', name: 'Aceh' },
  { id: '2', name: 'Sumatera Utara' },
  { id: '3', name: 'Sumatera Barat' },
  { id: '4', name: 'Riau' },
  { id: '5', name: 'Kepulauan Riau' },
  { id: '6', name: 'Jambi' },
  { id: '7', name: 'Sumatera Selatan' },
  { id: '8', name: 'Bangka Belitung' },
  { id: '9', name: 'Bengkulu' },
  { id: '10', name: 'Lampung' },
  { id: '11', name: 'DKI Jakarta' },
  { id: '12', name: 'Jawa Barat' },
  { id: '13', name: 'Banten' },
  { id: '14', name: 'Jawa Tengah' },
  { id: '15', name: 'DI Yogyakarta' },
  { id: '16', name: 'Jawa Timur' },
  { id: '17', name: 'Bali' },
  { id: '18', name: 'Nusa Tenggara Barat' },
  { id: '19', name: 'Nusa Tenggara Timur' },
  { id: '20', name: 'Kalimantan Barat' },
  { id: '21', name: 'Kalimantan Tengah' },
  { id: '22', name: 'Kalimantan Selatan' },
  { id: '23', name: 'Kalimantan Timur' },
  { id: '24', name: 'Kalimantan Utara' },
  { id: '25', name: 'Sulawesi Utara' },
  { id: '26', name: 'Sulawesi Tengah' },
  { id: '27', name: 'Sulawesi Selatan' },
  { id: '28', name: 'Sulawesi Tenggara' },
  { id: '29', name: 'Gorontalo' },
  { id: '30', name: 'Sulawesi Barat' },
  { id: '31', name: 'Maluku' },
  { id: '32', name: 'Maluku Utara' },
  { id: '33', name: 'Papua' },
  { id: '34', name: 'Papua Barat' },
  { id: '35', name: 'Papua Selatan' },
  { id: '36', name: 'Papua Tengah' },
  { id: '37', name: 'Papua Pegunungan' },
  { id: '38', name: 'Papua Barat Daya' },
];

export const CITIES: City[] = [
  // DKI Jakarta
  { id: '1101', provinceId: '11', name: 'Jakarta Pusat' },
  { id: '1102', provinceId: '11', name: 'Jakarta Utara' },
  { id: '1103', provinceId: '11', name: 'Jakarta Barat' },
  { id: '1104', provinceId: '11', name: 'Jakarta Selatan' },
  { id: '1105', provinceId: '11', name: 'Jakarta Timur' },
  // Jawa Barat
  { id: '1201', provinceId: '12', name: 'Bandung' },
  { id: '1202', provinceId: '12', name: 'Bekasi' },
  { id: '1203', provinceId: '12', name: 'Depok' },
  { id: '1204', provinceId: '12', name: 'Bogor' },
  { id: '1205', provinceId: '12', name: 'Cimahi' },
  { id: '1206', provinceId: '12', name: 'Sukabumi' },
  { id: '1207', provinceId: '12', name: 'Cirebon' },
  // Banten
  { id: '1301', provinceId: '13', name: 'Tangerang' },
  { id: '1302', provinceId: '13', name: 'Tangerang Selatan' },
  { id: '1303', provinceId: '13', name: 'Serang' },
  { id: '1304', provinceId: '13', name: 'Cilegon' },
  // Jawa Tengah
  { id: '1401', provinceId: '14', name: 'Semarang' },
  { id: '1402', provinceId: '14', name: 'Surakarta' },
  { id: '1403', provinceId: '14', name: 'Magelang' },
  { id: '1404', provinceId: '14', name: 'Pekalongan' },
  { id: '1405', provinceId: '14', name: 'Salatiga' },
  { id: '1406', provinceId: '14', name: 'Tegal' },
  // DI Yogyakarta
  { id: '1501', provinceId: '15', name: 'Yogyakarta' },
  { id: '1502', provinceId: '15', name: 'Sleman' },
  { id: '1503', provinceId: '15', name: 'Bantul' },
  // Jawa Timur
  { id: '1601', provinceId: '16', name: 'Surabaya' },
  { id: '1602', provinceId: '16', name: 'Malang' },
  { id: '1603', provinceId: '16', name: 'Sidoarjo' },
  { id: '1604', provinceId: '16', name: 'Kediri' },
  { id: '1605', provinceId: '16', name: 'Madiun' },
  { id: '1606', provinceId: '16', name: 'Blitar' },
  { id: '1607', provinceId: '16', name: 'Pasuruan' },
  { id: '1608', provinceId: '16', name: 'Probolinggo' },
  { id: '1609', provinceId: '16', name: 'Mojokerto' },
  { id: '1610', provinceId: '16', name: 'Batu' },
  // Bali
  { id: '1701', provinceId: '17', name: 'Denpasar' },
  { id: '1702', provinceId: '17', name: 'Badung' },
  { id: '1703', provinceId: '17', name: 'Gianyar' },
  // Sumatera Utara
  { id: '201', provinceId: '2', name: 'Medan' },
  { id: '202', provinceId: '2', name: 'Binjai' },
  { id: '203', provinceId: '2', name: 'Pematangsiantar' },
  // Sumatera Selatan
  { id: '701', provinceId: '7', name: 'Palembang' },
  // Sulawesi Selatan
  { id: '2701', provinceId: '27', name: 'Makassar' },
  // Kalimantan Timur
  { id: '2301', provinceId: '23', name: 'Samarinda' },
  { id: '2302', provinceId: '23', name: 'Balikpapan' },
];
