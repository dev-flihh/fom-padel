# Mekanisme Match Setting, Pilih Wallpaper, dan Pertandingan Aktif

Dokumen ini menjelaskan alur dari halaman Match Setting sampai pertandingan berhasil tergenerate, user memilih wallpaper, lalu masuk ke halaman Active Match. Fokusnya adalah apa saja menu yang tersedia, pilihan yang bisa dipilih, dan dampaknya terhadap jadwal pertandingan, scoring, klasemen, serta pengalaman host saat menjalankan match.

## Ringkasan Alur

Secara garis besar, flow pembuatan match berjalan seperti ini:

1. Host masuk ke halaman Set Up Match.
2. Host mengisi informasi match: nama match, venue, dan area/city.
3. Host memilih rules: format pertandingan, metode scoring, ranking criteria, jumlah court, jumlah ronde, dan total points.
4. Host memilih pemain yang akan ikut bermain.
5. Tombol Generate Match aktif jika jumlah pemain sudah cukup untuk jumlah court yang dipilih.
6. Setelah Generate Match ditekan, sistem membuat struktur ronde dan match sesuai format.
7. Sistem mengarahkan host ke halaman Select Background.
8. Host memilih wallpaper atau menekan Skip untuk memakai wallpaper random.
9. Setelah Continue to Match, host masuk ke halaman Active Match.
10. Di Active Match, ronde pertama sudah aktif dan host bisa mulai input skor.

Alur pentingnya adalah: Match Setting bukan langsung membuka pertandingan aktif. Setelah Generate Match, sistem membuat data pertandingan terlebih dahulu, lalu masuk ke halaman pemilihan wallpaper. Wallpaper yang dipilih akan dipakai sebagai visual utama di halaman Active Match.

## Halaman Set Up Match

Halaman Set Up Match terdiri dari tiga bagian besar:

1. Match Info
2. Rules
3. Players

Di bagian bawah halaman ada sticky summary yang menampilkan kesiapan setup dan tombol Generate Match.

## Bagian Match Info

Bagian Match Info dipakai untuk memberi identitas pada pertandingan.

### Match Name

Menu ini digunakan untuk mengisi nama pertandingan.

Contoh:

- Friday Padel Match
- FOM Weekend Game
- Latihan Rabu Malam

Impact:

- Nama ini menjadi nama tournament atau match yang muncul di Active Match, riwayat, notifikasi, dan sharing.
- Jika dikosongkan, sistem memakai default Padel Match saat generate.
- Nama ini membantu membedakan satu match dengan match lain di history.

### Venue

Menu ini digunakan untuk mengisi nama tempat atau venue.

Contoh:

- Star Padel Karawaci
- Padel Pro Kemang
- Court 12 Senayan

Impact:

- Venue akan muncul sebagai informasi lokasi di halaman Active Match.
- Venue juga ikut terbawa ke data tournament dan history.
- Informasi ini memudahkan pemain memahami match tersebut berlangsung di mana.

### Area / City

Menu ini digunakan untuk mengisi area atau kota.

Contoh:

- Tangerang
- Jakarta Selatan
- Bandung

Saat user mengetik minimal 3 karakter, sistem akan mencoba menampilkan suggestion lokasi. Source suggestion bisa berasal dari Google Maps atau OpenStreetMap, tergantung konfigurasi dan ketersediaan API.

Pilihan yang tersedia:

- Ketik manual area/city.
- Pilih dari suggestion lokasi jika tersedia.
- Tetap lanjut tanpa suggestion jika pencarian lokasi sedang tidak tersedia.

Impact:

- Area/city akan muncul di Active Match bersama venue dan tanggal match.
- Area/city membantu konteks match, terutama jika match dibagikan atau dilihat kembali di history.
- Jika suggestion dipilih, nilai input akan mengikuti nama lokasi dari suggestion.

## Bagian Rules

Bagian Rules menentukan format permainan, cara scoring, cara ranking dipakai, dan struktur match.

### Format

Ada tiga pilihan format:

- Match Play
- Americano
- Mexicano

Impact utama:

- Format menentukan cara sistem membuat pasangan, lawan, ronde, dan scoring.
- Format juga menentukan tampilan tema warna di Active Match.
- Format menentukan apakah Total Points dipakai atau tidak.
- Format menentukan cara ronde berikutnya dibuat.

## Format Match Play

Match Play adalah format pertandingan yang lebih klasik dan fokus pada pertandingan head-to-head.

Cara kerja:

- Sistem mengacak pemain untuk ronde pertama.
- Setiap match terdiri dari 4 pemain: 2 pemain Team A melawan 2 pemain Team B.
- Scoring memakai gaya tenis: 0, 15, 30, 40, Advantage, Game.
- Score match dihitung dari jumlah game yang dimenangkan.
- Set dianggap selesai ketika salah satu team mencapai minimal 6 game dan unggul minimal 2 game.

Pilihan tambahan yang muncul khusus Match Play:

- Golden Point
- Advantage

Impact Match Play:

- Total Points tidak ditampilkan karena Match Play tidak memakai target total poin seperti 21 points.
- Ronde pertama dibuat aktif saat generate.
- Ronde berikutnya dibuat ketika host menekan Next Round.
- Pairing ronde berikutnya dibuat random dari active players.
- Cocok untuk pertandingan yang ingin terasa seperti match padel/tenis klasik.

### Deuce Method pada Match Play

Deuce Method hanya muncul ketika format yang dipilih adalah Match Play.

#### Golden Point

Golden Point berarti ketika skor game berada di 40-40, poin berikutnya langsung menentukan pemenang game.

Impact:

- Game lebih cepat selesai.
- Durasi pertandingan lebih mudah dikontrol.
- Cocok untuk event komunitas atau court time yang terbatas.

#### Advantage

Advantage berarti ketika skor 40-40, team harus mendapatkan advantage terlebih dahulu. Jika lawan mengambil poin berikutnya, skor kembali ke 40-40.

Impact:

- Game bisa berlangsung lebih panjang.
- Lebih dekat dengan format tenis/padel klasik.
- Cocok untuk pertandingan yang ingin lebih kompetitif dan tidak terburu-buru.

## Format Americano

Americano adalah format rotasi sosial. Tujuannya adalah membuat pemain berganti pasangan dan lawan antar ronde, sehingga semua pemain mendapat variasi bermain.

Cara kerja di sistem:

- Saat Generate Match ditekan, sistem langsung membuat semua ronde sesuai jumlah Rounds yang dipilih.
- Ronde pertama diberi status active.
- Ronde berikutnya diberi status pending.
- Saat host menekan Next Round, ronde aktif ditandai completed, lalu ronde pending berikutnya diaktifkan.
- Sistem berusaha menyeimbangkan jumlah match setiap pemain.
- Sistem berusaha mengurangi pasangan yang berulang.
- Sistem berusaha mengurangi lawan yang berulang.
- Jika ada pemain lebih dari kapasitas court, sebagian pemain masuk players bye di ronde tersebut.

Contoh:

- 1 court membutuhkan 4 pemain per ronde.
- 2 courts membutuhkan 8 pemain per ronde.
- Jika ada 10 pemain dan 2 courts, 8 pemain bermain dan 2 pemain bye.
- Pada ronde berikutnya, sistem mencoba memberi kesempatan bermain lebih merata.

Impact Americano:

- Cocok untuk komunitas karena rotasi terasa lebih adil dan variatif.
- Host tidak perlu membuat ronde satu per satu karena jadwal semua ronde sudah dipersiapkan sejak awal.
- Jika pemain aktif berubah saat match berjalan, future rounds Americano dapat dibangun ulang agar mengikuti active players terbaru.
- Total Points dipakai untuk menentukan skor akhir setiap match.

## Format Mexicano

Mexicano adalah format rotasi kompetitif. Ronde berikutnya dipengaruhi oleh hasil ronde sebelumnya.

Cara kerja di sistem:

- Saat Generate Match ditekan, sistem hanya membuat ronde pertama.
- Ronde pertama dibuat random dari active players.
- Setelah ronde selesai dan host menekan Next Round, sistem menghitung performa pemain dari ronde yang sudah dimainkan.
- Sistem menyusun pemain untuk ronde berikutnya berdasarkan fairness dan ranking.
- Pemain dengan jumlah match lebih sedikit diprioritaskan agar kesempatan bermain tetap merata.
- Di dalam kelompok yang jumlah match-nya sama, sistem memakai standing sesuai ranking criteria.
- Untuk setiap grup 4 pemain, pairing Mexicano dibuat dengan pola 1 dan 4 melawan 2 dan 3.

Contoh pola ranking dalam satu grup:

- Player 1: ranking tertinggi di grup
- Player 2: ranking kedua
- Player 3: ranking ketiga
- Player 4: ranking keempat

Pairing:

- Team A: Player 1 + Player 4
- Team B: Player 2 + Player 3

Impact Mexicano:

- Ronde berikutnya terasa lebih kompetitif karena hasil sebelumnya mempengaruhi susunan match.
- Pemain yang performanya mirip cenderung akan berada di kelompok yang relevan.
- Sistem tetap menjaga fairness dengan melihat jumlah match yang sudah dimainkan.
- Cocok untuk event yang ingin ada rasa naik-turun posisi dan kompetisi antar pemain.

## Ranking Criteria

Ranking Criteria punya dua pilihan:

- Matches Won
- Points Won

### Matches Won

Ranking mengutamakan jumlah kemenangan match.

Impact:

- Pemain yang paling sering menang akan diprioritaskan lebih tinggi.
- Pada Mexicano, pilihan ini mempengaruhi cara sistem menyusun standing untuk ronde berikutnya.
- Jika jumlah win sama, sistem memakai pembeda lain seperti point difference.

Cocok untuk:

- Game yang ingin menekankan hasil menang/kalah.
- Event yang ingin terasa lebih kompetitif.

### Points Won

Ranking mengutamakan total poin yang dikumpulkan.

Impact:

- Pemain tetap mendapat nilai dari poin yang dikumpulkan walaupun kalah.
- Pada Mexicano, pilihan ini mempengaruhi cara sistem menyusun standing untuk ronde berikutnya.
- Jika total points sama, sistem memakai point difference sebagai pembeda.

Cocok untuk:

- Game komunitas yang ingin semua poin tetap berarti.
- Format yang ingin mengurangi efek "kalah tipis tetap terasa rugi besar".

Catatan penting: pada tampilan standings, sistem tetap menampilkan statistik seperti W, L, D, point difference, dan total points. Untuk penyusunan ronde Mexicano, Ranking Criteria menjadi input penting saat menentukan urutan performa pemain.

## Match Structure

Match Structure mengatur jumlah court, jumlah ronde, dan total points.

### Courts

Pilihan cepat:

- 1 Court
- 2 Courts
- 3 Courts
- 4 Courts
- 5 Courts

Pilihan tambahan:

- Custom

Batas custom:

- Minimum 1 court
- Maksimum 12 courts

Impact:

- Jumlah court menentukan jumlah match yang bisa berjalan bersamaan dalam satu ronde.
- Setiap court membutuhkan 4 pemain.
- Minimum pemain agar Generate Match aktif adalah courts x 4.
- Jika jumlah pemain lebih banyak dari kapasitas court, sisanya menjadi players bye.

Contoh:

- 1 court butuh minimal 4 pemain.
- 2 courts butuh minimal 8 pemain.
- 3 courts butuh minimal 12 pemain.

### Rounds

Pilihan cepat:

- 3
- 4
- 5
- 6
- 7
- 8
- 9
- 10
- 11
- 12

Pilihan tambahan:

- Custom

Batas custom:

- Minimum 1 round
- Maksimum 30 rounds

Impact:

- Jumlah rounds menentukan berapa ronde yang akan dimainkan sebelum match selesai.
- Pada Americano, semua ronde dibuat sejak awal.
- Pada Mexicano dan Match Play, ronde pertama dibuat saat generate, lalu ronde berikutnya dibuat saat host menekan Next Round.
- Jika ronde terakhir selesai, tombol Next Round berubah menjadi Finish Matches dan tournament akan masuk fase selesai.

### Total Points

Total Points hanya muncul untuk Americano dan Mexicano. Menu ini tidak muncul untuk Match Play.

Pilihan cepat:

- 4 pts
- 5 pts
- 16 pts
- 21 pts

Pilihan tambahan:

- Custom

Batas custom:

- Minimum 1 point
- Maksimum 99 points

Impact:

- Total Points menentukan total skor gabungan Team A dan Team B dalam satu match.
- Saat host menaikkan skor salah satu team, skor team lawan otomatis menyesuaikan agar totalnya tetap sesuai Total Points.
- Sebuah skor dianggap lengkap jika score Team A + score Team B sama dengan Total Points.
- Jika host menekan Next Round sementara ada match yang total skornya belum lengkap, sistem memberi konfirmasi terlebih dahulu.

Contoh Total Points 21:

- 11-10 valid karena totalnya 21.
- 15-6 valid karena totalnya 21.
- 8-7 belum lengkap karena totalnya baru 15.

## Bagian Players

Bagian Players dipakai untuk menentukan siapa saja yang ikut match.

### Selected Players

Selected Players menampilkan daftar pemain yang sudah dipilih.

Informasi yang ditampilkan:

- Jumlah pemain yang sudah dipilih.
- Status Ready jika jumlah pemain cukup.
- Jumlah kekurangan pemain jika belum cukup.
- Chip nama pemain yang sudah masuk.
- Label You untuk akun host/current user.

Impact:

- Generate Match hanya aktif jika jumlah pemain memenuhi kebutuhan minimum.
- Kebutuhan minimum dihitung dari jumlah court x 4.
- Pemain yang dipilih akan menjadi player pool untuk generator ronde.

### Choose Friends

Menu ini membuka daftar teman FOM untuk dipilih sebagai pemain match.

Impact:

- Pemain dari daftar teman masuk sebagai FOM player.
- Data seperti nama, avatar, dan rating/MMR bisa mengikuti data profil terbaru.
- Cocok jika pemain sudah punya akun atau sudah terhubung sebagai teman.

### Add New Player

Menu ini digunakan untuk menambahkan pemain manual.

Impact:

- Pemain baru langsung masuk ke daftar pemain dan langsung dipilih ke match.
- Cocok untuk pemain tamu atau pemain yang belum punya akun FOM.
- Pemain manual tetap bisa ikut dalam pairing, scoring, dan standings match tersebut.

### Available Players

Available Players menampilkan pemain yang ada di daftar tetapi belum dipilih ke match.

Pilihan yang tersedia:

- Add: memasukkan pemain ke Selected Players.
- Remove: menghapus pemain dari daftar available players.

Impact:

- Add menambah pemain ke pool match.
- Remove menghapus pemain dari list pemain lokal.
- Akun host/current user tidak bisa dihapus dari player list.

### Player Data Sync Notice

Jika sistem menemukan data pemain yang duplikat atau ada selected player yang belum ada di list, sistem akan melakukan sinkronisasi.

Impact:

- Duplikat selected players dibersihkan.
- Pemain yang hilang dari list bisa dipulihkan.
- Tujuannya agar data pemain stabil sebelum match digenerate.

## Tombol Generate Match

Tombol Generate Match berada di bagian bawah halaman.

Kondisi tombol:

- Disabled jika pemain belum cukup.
- Enabled jika jumlah selected players minimal sama dengan courts x 4.

Saat ditekan, sistem melakukan beberapa hal:

1. Mengambil semua setting terbaru dari halaman.
2. Mengisi default name menjadi Padel Match jika nama dikosongkan.
3. Menyimpan format, criteria, scoring type, courts, total points, players, rounds, venue, dan location.
4. Mengosongkan rounds lama.
5. Mengirim data setting ke generator tournament.
6. Membuat tournament id jika belum ada.
7. Mengisi startedAt dengan waktu saat generate.
8. Menghapus backgroundId sementara, karena user akan memilih wallpaper setelah generate.
9. Membuat struktur ronde sesuai format.
10. Menyimpan snapshot active tournament.
11. Mengarahkan host ke halaman Select Background.

## Cara Sistem Menggenerate Match

Generator bekerja berbeda untuk setiap format.

### Generate Americano

Saat format Americano dipilih:

- Sistem membaca active players.
- Sistem membuat semua ronde dari ronde 1 sampai numRounds.
- Ronde 1 dibuat dengan status active.
- Ronde 2 dan seterusnya dibuat dengan status pending.
- Setiap match memiliki court number, roundId, status, teamA, teamB, dan score awal 0-0.
- Sistem mencatat jumlah match tiap pemain.
- Sistem mencatat histori partner tiap pemain.
- Sistem mencatat histori opponent tiap pemain.
- Sistem memberi penalty ke kombinasi yang terlalu sering berulang.
- Sistem memilih kombinasi dengan penalty paling rendah.

Impact:

- Pairing dibuat lebih variatif.
- Kesempatan bermain lebih seimbang.
- Jadwal Americano sudah tersedia dari awal, sehingga Next Round tinggal mengaktifkan ronde berikutnya.

### Generate Mexicano

Saat format Mexicano dipilih:

- Sistem mengacak active players untuk ronde pertama.
- Sistem hanya membuat ronde 1.
- Semua match di ronde 1 langsung berstatus active.
- Ronde berikutnya belum dibuat sampai host menekan Next Round.

Impact:

- Ronde pertama menjadi starting point.
- Hasil ronde pertama akan mempengaruhi penyusunan ronde kedua.
- Mexicano terasa dinamis karena pairing tidak dikunci dari awal.

### Generate Match Play

Saat format Match Play dipilih:

- Sistem mengacak active players untuk ronde pertama.
- Sistem hanya membuat ronde 1.
- Semua match di ronde 1 langsung berstatus active.
- Setiap match memiliki pointsA dan pointsB dengan nilai awal 0.
- Setiap team memiliki sets dengan nilai awal 0.
- Scoring memakai Golden Point atau Advantage sesuai pilihan Deuce Method.

Impact:

- Match Play siap dimainkan langsung dengan scoring tenis/padel.
- Total Points tidak digunakan.
- Ronde berikutnya dibuat random ketika host menekan Next Round.

## Halaman Select Background

Setelah Generate Match berhasil, host masuk ke halaman Select Background.

Menu yang tersedia:

- Pilih salah satu gambar dari koleksi app.
- Continue to Match.
- Skip.
- Skip (Random).
- Back ke halaman Set Up Match.

### Pilih Wallpaper

Host bisa memilih satu wallpaper dari grid gambar.

Impact:

- Wallpaper yang dipilih disimpan sebagai backgroundId tournament.
- Wallpaper tersebut akan tampil di halaman Active Match.
- Tombol Continue to Match hanya aktif jika sudah ada wallpaper yang dipilih.

### Continue to Match

Tombol ini membawa host ke halaman Active Match.

Impact:

- Sistem menyimpan backgroundId ke tournament.
- Active screen tournament direset agar memakai tournament aktif terbaru.
- Back screen diset ke dashboard.
- Screen berubah menjadi active.

### Skip / Skip (Random)

Skip memilih wallpaper random dari pool background.

Impact:

- Sistem memilih random background.
- backgroundId tetap disimpan ke tournament.
- Host langsung masuk ke Active Match tanpa memilih manual.

Catatan: walaupun daftar background awalnya dikelompokkan per format, pool yang dipakai saat ini berasal dari semua background match yang tersedia di app. Jadi pilihan wallpaper yang muncul bisa berasal dari koleksi Americano, Mexicano, maupun Match Play.

## Halaman Active Match

Setelah Continue to Match atau Skip, host masuk ke halaman Active Match.

Yang terjadi saat masuk:

- Ronde aktif sudah tersedia.
- Match aktif per court sudah tersedia.
- Team A dan Team B sudah terbentuk.
- Score awal bernilai 0.
- Wallpaper yang dipilih tampil sebagai hero visual.
- Tema warna halaman mengikuti format.
- Informasi match seperti format, venue, area/city, dan tanggal bisa ditampilkan.

### Active Round

Active Round adalah ronde yang memiliki minimal satu match dengan status active.

Impact:

- Host menginput score pada match di ronde aktif.
- Ronde lain yang belum aktif tetap pending, khususnya pada Americano.
- Setelah host menekan Next Round, ronde aktif akan ditandai completed.

### Input Score untuk Americano dan Mexicano

Pada Americano dan Mexicano:

- Score berbasis Total Points.
- Jika Total Points 21, maka total score Team A + Team B idealnya 21.
- Saat score salah satu team dinaikkan, score lawan otomatis menyesuaikan terhadap Total Points.
- Sistem bisa mendeteksi apakah score ronde sudah lengkap.

Impact:

- Input skor lebih cepat.
- Risiko total poin tidak sesuai lebih kecil.
- Jika score belum lengkap, host tetap bisa lanjut setelah konfirmasi.

### Input Score untuk Match Play

Pada Match Play:

- Score berbasis point tenis: 0, 15, 30, 40, Advantage, Game.
- Golden Point atau Advantage mengikuti pilihan Deuce Method.
- Saat game dimenangkan, game count team bertambah.
- Set selesai jika team mencapai minimal 6 game dan unggul minimal 2 game.

Impact:

- Scoring lebih cocok untuk match klasik.
- Host tidak perlu mengatur Total Points.
- Progress match dihitung dari point dan game.

## Next Round

Tombol Next Round dipakai untuk menyelesaikan ronde aktif dan melanjutkan ke ronde berikutnya.

Behavior umum:

- Ronde aktif ditandai completed.
- Durasi match dihitung dari startedAt sampai waktu Next Round ditekan.
- Jika belum ronde terakhir, sistem membuat atau mengaktifkan ronde berikutnya.
- Jika sudah ronde terakhir, sistem menyelesaikan tournament.

Behavior per format:

- Americano: mengaktifkan ronde pending berikutnya yang sudah dibuat sejak awal.
- Mexicano: membuat ronde baru berdasarkan hasil ronde sebelumnya.
- Match Play: membuat ronde baru secara random dengan scoring Match Play.

Jika match Americano/Mexicano belum memenuhi Total Points:

- Sistem menampilkan konfirmasi.
- Host bisa batal untuk melengkapi skor.
- Host bisa lanjut dengan skor belum lengkap.

## Finish Matches

Jika ronde aktif adalah ronde terakhir, tombol Next Round berubah menjadi Finish Matches.

Saat selesai:

- Ronde terakhir ditandai completed.
- Tournament diberi endedAt.
- Tournament masuk ke history/finalized state.
- Klasemen final bisa dilihat dan dibagikan.
- Statistik dan leaderboard dapat disinkronkan.

## Players Bye

Players Bye adalah pemain yang tidak bermain pada ronde tertentu karena jumlah pemain melebihi kapasitas court atau tidak cukup membentuk kelipatan 4.

Contoh:

- 10 pemain, 2 courts: 8 pemain main, 2 pemain bye.
- 14 pemain, 3 courts: 12 pemain main, 2 pemain bye.
- 7 pemain, 1 court: 4 pemain main, 3 pemain bye.

Impact:

- Pemain bye tidak mendapat skor pada ronde tersebut.
- Pada Americano dan Mexicano, sistem berusaha menjaga kesempatan bermain tetap merata.
- Pada Mexicano, pemain dengan match count lebih sedikit diprioritaskan pada ronde berikutnya.

## Perbandingan Format

| Format | Cara generate awal | Cara ronde berikutnya | Scoring | Cocok untuk |
| --- | --- | --- | --- | --- |
| Match Play | Ronde pertama saja | Random saat Next Round | 0, 15, 30, 40, Advantage/Game | Pertandingan klasik |
| Americano | Semua ronde langsung dibuat | Mengaktifkan pending round | Total Points | Rotasi sosial dan variasi pasangan |
| Mexicano | Ronde pertama saja | Dibuat berdasarkan hasil ronde sebelumnya | Total Points | Rotasi kompetitif berbasis performa |

## Kesimpulan

Match Setting adalah pusat konfigurasi pertandingan. Semua pilihan di halaman ini punya dampak langsung terhadap cara match dibuat: format menentukan logic pertandingan, courts menentukan kebutuhan pemain, rounds menentukan durasi event, total points menentukan scoring Americano/Mexicano, ranking criteria mempengaruhi penyusunan ronde Mexicano, dan players menentukan pool pemain yang akan dirotasi.

Setelah Generate Match, sistem tidak langsung masuk ke match aktif. Sistem terlebih dahulu membuat struktur pertandingan, menyimpan tournament aktif, lalu membawa host ke Select Background. Dari sana, host memilih wallpaper atau memakai random wallpaper. Setelah Continue to Match atau Skip, pertandingan masuk ke Active Match dengan ronde pertama sudah aktif dan siap di-score.
