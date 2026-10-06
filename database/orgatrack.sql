-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 06, 2026 at 12:48 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `orgatrack`
--

-- --------------------------------------------------------

--
-- Table structure for table `action_items`
--

CREATE TABLE `action_items` (
  `id` int(11) NOT NULL,
  `minute_id` int(11) NOT NULL,
  `deskripsi` varchar(255) NOT NULL,
  `task_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendances`
--

CREATE TABLE `attendances` (
  `id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `waktu_checkin` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_sessions`
--

CREATE TABLE `attendance_sessions` (
  `id` int(11) NOT NULL,
  `meeting_id` int(11) NOT NULL,
  `kode` varchar(10) NOT NULL,
  `berlaku_hingga` datetime NOT NULL,
  `dibuka_oleh` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `budget_items`
--

CREATE TABLE `budget_items` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `division_id` int(11) DEFAULT NULL,
  `nama_pos` varchar(100) NOT NULL,
  `jumlah_rencana` decimal(15,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `budget_items`
--

INSERT INTO `budget_items` (`id`, `event_id`, `division_id`, `nama_pos`, `jumlah_rencana`) VALUES
(1, 1, NULL, 'Konsumsi', 5000000.00),
(2, 1, NULL, 'Publikasi dan dokumentasi', 2000000.00),
(3, 1, NULL, 'Perlengkapan', 3500000.00),
(4, 1, NULL, 'Sewa tempat dan sound system', 6000000.00);

-- --------------------------------------------------------

--
-- Table structure for table `divisions`
--

CREATE TABLE `divisions` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `divisions`
--

INSERT INTO `divisions` (`id`, `event_id`, `nama`) VALUES
(1, 1, 'Acara'),
(2, 3, 'Acara'),
(3, 2, 'Acara'),
(4, 1, 'bbbb');

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `id` int(11) NOT NULL,
  `nama` varchar(150) NOT NULL,
  `tanggal` date NOT NULL,
  `lokasi` varchar(150) DEFAULT NULL,
  `deskripsi` text DEFAULT NULL,
  `dibuat_oleh` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`id`, `nama`, `tanggal`, `lokasi`, `deskripsi`, `dibuat_oleh`, `created_at`) VALUES
(1, 'Seminar Nasional Teknologi 2026', '2026-10-18', 'Auditorium Kampus', 'Seminar teknologi', 1, '2026-10-06 15:29:11'),
(2, 'Dies Natalis Himpunan 2026', '2026-11-12', 'Aula Utama Kampus', 'Ulang tahun himpunan', 2, '2026-10-06 15:29:11'),
(3, 'Workshop UI/UX Design Series', '2027-01-15', 'Lab Komputer A', 'Rangkaian workshop', 1, '2026-10-06 15:29:11');

-- --------------------------------------------------------

--
-- Table structure for table `event_members`
--

CREATE TABLE `event_members` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `division_id` int(11) DEFAULT NULL,
  `peran` enum('ketua','koordinator','bendahara','sekretaris','anggota') NOT NULL,
  `status` enum('menunggu','aktif','ditolak') NOT NULL DEFAULT 'menunggu',
  `joined_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_members`
--

INSERT INTO `event_members` (`id`, `event_id`, `user_id`, `division_id`, `peran`, `status`, `joined_at`) VALUES
(1, 1, 1, NULL, 'ketua', 'aktif', '2026-10-06 15:29:11'),
(2, 2, 1, NULL, 'koordinator', 'aktif', '2026-10-06 15:29:11'),
(3, 3, 1, NULL, 'anggota', 'aktif', '2026-10-06 15:29:11'),
(4, 1, 2, NULL, 'bendahara', 'aktif', '2026-10-06 16:08:38'),
(5, 3, 2, NULL, 'anggota', 'aktif', '2026-10-06 16:08:38'),
(6, 2, 2, NULL, 'anggota', 'aktif', '2026-10-06 16:08:38'),
(7, 1, 6, NULL, 'anggota', 'aktif', '2026-10-06 16:08:38'),
(8, 3, 6, NULL, 'anggota', 'aktif', '2026-10-06 16:08:38'),
(9, 2, 6, NULL, 'anggota', 'aktif', '2026-10-06 16:08:38'),
(10, 1, 7, NULL, 'bendahara', 'aktif', '2026-10-06 16:08:38'),
(11, 3, 7, NULL, 'anggota', 'aktif', '2026-10-06 16:08:38'),
(12, 2, 7, NULL, 'anggota', 'aktif', '2026-10-06 16:08:38'),
(13, 1, 4, 4, 'koordinator', 'aktif', '2026-10-06 16:08:38'),
(14, 3, 4, NULL, 'anggota', 'aktif', '2026-10-06 16:08:38'),
(15, 2, 4, NULL, 'anggota', 'aktif', '2026-10-06 16:08:38'),
(16, 1, 3, NULL, 'anggota', 'aktif', '2026-10-06 16:08:38'),
(17, 3, 3, NULL, 'anggota', 'aktif', '2026-10-06 16:08:38'),
(18, 2, 3, NULL, 'anggota', 'aktif', '2026-10-06 16:08:38');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `budget_item_id` int(11) NOT NULL,
  `diajukan_oleh` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `nominal` decimal(15,2) NOT NULL,
  `keterangan` varchar(255) NOT NULL,
  `bukti_nota` varchar(255) NOT NULL,
  `status` enum('menunggu','disetujui','ditolak') NOT NULL DEFAULT 'menunggu',
  `catatan_verifikasi` text DEFAULT NULL,
  `diverifikasi_oleh` int(11) DEFAULT NULL,
  `diverifikasi_pada` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `incomes`
--

CREATE TABLE `incomes` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `sumber` varchar(100) NOT NULL,
  `nominal` decimal(15,2) NOT NULL,
  `tanggal` date NOT NULL,
  `dicatat_oleh` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `incomes`
--

INSERT INTO `incomes` (`id`, `event_id`, `sumber`, `nominal`, `tanggal`, `dicatat_oleh`) VALUES
(1, 1, 'Kas himpunan', 6000000.00, '2026-09-20', 1),
(2, 1, 'Sponsor', 8000000.00, '2026-09-28', 1),
(3, 1, 'Iuran panitia', 2000000.00, '2026-10-01', 1);

-- --------------------------------------------------------

--
-- Table structure for table `invitations`
--

CREATE TABLE `invitations` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `kode` varchar(20) NOT NULL,
  `dibuat_oleh` int(11) NOT NULL,
  `kedaluwarsa_pada` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invitations`
--

INSERT INTO `invitations` (`id`, `event_id`, `kode`, `dibuat_oleh`, `kedaluwarsa_pada`) VALUES
(1, 1, 'ORGA26', 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `meetings`
--

CREATE TABLE `meetings` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `judul` varchar(150) NOT NULL,
  `waktu_mulai` datetime NOT NULL,
  `lokasi_atau_link` varchar(255) NOT NULL,
  `agenda` text NOT NULL,
  `dibuat_oleh` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `meetings`
--

INSERT INTO `meetings` (`id`, `event_id`, `judul`, `waktu_mulai`, `lokasi_atau_link`, `agenda`, `dibuat_oleh`) VALUES
(1, 1, 'Rapat koordinasi panitia', '2026-10-02 19:00:00', 'Ruang Himpunan', 'Pembagian tugas dan pengecekan anggaran.', 1);

-- --------------------------------------------------------

--
-- Table structure for table `meeting_minutes`
--

CREATE TABLE `meeting_minutes` (
  `id` int(11) NOT NULL,
  `meeting_id` int(11) NOT NULL,
  `pembahasan` text NOT NULL,
  `keputusan` text NOT NULL,
  `dibuat_oleh` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `meeting_participants`
--

CREATE TABLE `meeting_participants` (
  `id` int(11) NOT NULL,
  `meeting_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `konfirmasi` enum('belum','hadir','izin') NOT NULL DEFAULT 'belum'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `meeting_participants`
--

INSERT INTO `meeting_participants` (`id`, `meeting_id`, `user_id`, `konfirmasi`) VALUES
(1, 1, 1, 'belum'),
(2, 1, 2, 'belum'),
(3, 1, 6, 'belum'),
(4, 1, 7, 'belum'),
(5, 1, 4, 'belum'),
(6, 1, 3, 'belum');

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `division_id` int(11) NOT NULL,
  `judul` varchar(150) NOT NULL,
  `deskripsi` text DEFAULT NULL,
  `penanggung_jawab_id` int(11) NOT NULL,
  `deadline` datetime NOT NULL,
  `prioritas` enum('rendah','sedang','tinggi') NOT NULL DEFAULT 'sedang',
  `status` enum('todo','in_progress','done','disetujui') NOT NULL DEFAULT 'todo',
  `catatan_revisi` text DEFAULT NULL,
  `dibuat_oleh` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `event_id`, `division_id`, `judul`, `deskripsi`, `penanggung_jawab_id`, `deadline`, `prioritas`, `status`, `catatan_revisi`, `dibuat_oleh`) VALUES
(1, 1, 1, 'Tugas persiapan 1', NULL, 1, '2026-09-13 00:00:00', 'sedang', 'done', NULL, 1),
(2, 1, 1, 'Tugas persiapan 11', NULL, 1, '2026-09-23 00:00:00', 'sedang', 'done', NULL, 1),
(3, 1, 1, 'Tugas persiapan 21', NULL, 1, '2026-10-03 00:00:00', 'sedang', 'done', NULL, 1),
(4, 1, 1, 'Tugas persiapan 31', NULL, 1, '2026-10-13 00:00:00', 'sedang', 'todo', NULL, 1),
(5, 2, 3, 'Tugas persiapan 1', NULL, 1, '2026-10-08 00:00:00', 'sedang', 'done', NULL, 1),
(6, 2, 3, 'Tugas persiapan 11', NULL, 1, '2026-10-18 00:00:00', 'sedang', 'done', NULL, 1),
(7, 2, 3, 'Tugas persiapan 21', NULL, 1, '2026-10-28 00:00:00', 'sedang', 'todo', NULL, 1),
(8, 2, 3, 'Tugas persiapan 31', NULL, 1, '2026-11-07 00:00:00', 'sedang', 'todo', NULL, 1),
(9, 3, 2, 'Tugas persiapan 1', NULL, 1, '2026-12-11 00:00:00', 'sedang', 'done', NULL, 1),
(10, 3, 2, 'Tugas persiapan 11', NULL, 1, '2026-12-21 00:00:00', 'sedang', 'todo', NULL, 1),
(11, 1, 1, 'Tugas persiapan 2', NULL, 1, '2026-09-14 00:00:00', 'sedang', 'done', NULL, 1),
(12, 1, 1, 'Tugas persiapan 12', NULL, 1, '2026-09-24 00:00:00', 'sedang', 'done', NULL, 1),
(13, 1, 1, 'Tugas persiapan 22', NULL, 1, '2026-10-04 00:00:00', 'sedang', 'done', NULL, 1),
(14, 1, 1, 'Tugas persiapan 32', NULL, 1, '2026-10-14 00:00:00', 'sedang', 'todo', NULL, 1),
(15, 2, 3, 'Tugas persiapan 2', NULL, 1, '2026-10-09 00:00:00', 'sedang', 'done', NULL, 1),
(16, 2, 3, 'Tugas persiapan 12', NULL, 1, '2026-10-19 00:00:00', 'sedang', 'done', NULL, 1),
(17, 2, 3, 'Tugas persiapan 22', NULL, 1, '2026-10-29 00:00:00', 'sedang', 'todo', NULL, 1),
(18, 2, 3, 'Tugas persiapan 32', NULL, 1, '2026-11-08 00:00:00', 'sedang', 'todo', NULL, 1),
(19, 3, 2, 'Tugas persiapan 2', NULL, 1, '2026-12-12 00:00:00', 'sedang', 'done', NULL, 1),
(20, 3, 2, 'Tugas persiapan 12', NULL, 1, '2026-12-22 00:00:00', 'sedang', 'todo', NULL, 1),
(21, 1, 1, 'Tugas persiapan 3', NULL, 1, '2026-09-15 00:00:00', 'sedang', 'done', NULL, 1),
(22, 1, 1, 'Tugas persiapan 13', NULL, 1, '2026-09-25 00:00:00', 'sedang', 'done', NULL, 1),
(23, 1, 1, 'Tugas persiapan 23', NULL, 1, '2026-10-05 00:00:00', 'sedang', 'done', NULL, 1),
(24, 1, 1, 'Tugas persiapan 33', NULL, 1, '2026-10-15 00:00:00', 'sedang', 'in_progress', NULL, 1),
(25, 2, 3, 'Tugas persiapan 3', NULL, 1, '2026-10-10 00:00:00', 'sedang', 'done', NULL, 1),
(26, 2, 3, 'Tugas persiapan 13', NULL, 1, '2026-10-20 00:00:00', 'sedang', 'done', NULL, 1),
(27, 2, 3, 'Tugas persiapan 23', NULL, 1, '2026-10-30 00:00:00', 'sedang', 'todo', NULL, 1),
(28, 2, 3, 'Tugas persiapan 33', NULL, 1, '2026-11-09 00:00:00', 'sedang', 'todo', NULL, 1),
(29, 3, 2, 'Tugas persiapan 3', NULL, 1, '2026-12-13 00:00:00', 'sedang', 'done', NULL, 1),
(30, 3, 2, 'Tugas persiapan 13', NULL, 1, '2026-12-23 00:00:00', 'sedang', 'todo', NULL, 1),
(31, 1, 1, 'Tugas persiapan 4', NULL, 1, '2026-09-16 00:00:00', 'sedang', 'done', NULL, 1),
(32, 1, 1, 'Tugas persiapan 14', NULL, 1, '2026-09-26 00:00:00', 'sedang', 'done', NULL, 1),
(33, 1, 1, 'Tugas persiapan 24', NULL, 1, '2026-10-06 00:00:00', 'sedang', 'done', NULL, 1),
(34, 1, 1, 'Tugas persiapan 34', NULL, 1, '2026-10-16 00:00:00', 'sedang', 'done', NULL, 1),
(35, 2, 3, 'Tugas persiapan 4', NULL, 1, '2026-10-11 00:00:00', 'sedang', 'done', NULL, 1),
(36, 2, 3, 'Tugas persiapan 14', NULL, 1, '2026-10-21 00:00:00', 'sedang', 'done', NULL, 1),
(37, 2, 3, 'Tugas persiapan 24', NULL, 1, '2026-10-31 00:00:00', 'sedang', 'todo', NULL, 1),
(38, 3, 2, 'Tugas persiapan 4', NULL, 1, '2026-12-14 00:00:00', 'sedang', 'in_progress', NULL, 1),
(39, 3, 2, 'Tugas persiapan 14', NULL, 1, '2026-12-24 00:00:00', 'sedang', 'todo', NULL, 1),
(40, 1, 1, 'Tugas persiapan 5', NULL, 1, '2026-09-17 00:00:00', 'sedang', 'done', NULL, 1),
(41, 1, 1, 'Tugas persiapan 15', NULL, 1, '2026-09-27 00:00:00', 'sedang', 'done', NULL, 1),
(42, 1, 1, 'Tugas persiapan 25', NULL, 1, '2026-10-07 00:00:00', 'sedang', 'in_progress', NULL, 1),
(43, 1, 1, 'Tugas persiapan 35', NULL, 1, '2026-10-17 00:00:00', 'sedang', 'todo', NULL, 1),
(44, 2, 3, 'Tugas persiapan 5', NULL, 1, '2026-10-12 00:00:00', 'sedang', 'done', NULL, 1),
(45, 2, 3, 'Tugas persiapan 15', NULL, 1, '2026-10-22 00:00:00', 'sedang', 'in_progress', NULL, 1),
(46, 2, 3, 'Tugas persiapan 25', NULL, 1, '2026-11-01 00:00:00', 'sedang', 'todo', NULL, 1),
(47, 3, 2, 'Tugas persiapan 5', NULL, 1, '2026-12-15 00:00:00', 'sedang', 'in_progress', NULL, 1),
(48, 3, 2, 'Tugas persiapan 15', NULL, 1, '2026-12-25 00:00:00', 'sedang', 'todo', NULL, 1),
(49, 1, 1, 'Tugas persiapan 6', NULL, 1, '2026-09-18 00:00:00', 'sedang', 'done', NULL, 1),
(50, 1, 1, 'Tugas persiapan 16', NULL, 1, '2026-09-28 00:00:00', 'sedang', 'done', NULL, 1),
(51, 1, 1, 'Tugas persiapan 26', NULL, 1, '2026-10-08 00:00:00', 'sedang', 'in_progress', NULL, 1),
(52, 2, 3, 'Tugas persiapan 6', NULL, 1, '2026-10-13 00:00:00', 'sedang', 'done', NULL, 1),
(53, 2, 3, 'Tugas persiapan 16', NULL, 1, '2026-10-23 00:00:00', 'sedang', 'in_progress', NULL, 1),
(54, 2, 3, 'Tugas persiapan 26', NULL, 1, '2026-11-02 00:00:00', 'sedang', 'todo', NULL, 1),
(55, 3, 2, 'Tugas persiapan 6', NULL, 1, '2026-12-16 00:00:00', 'sedang', 'in_progress', NULL, 1),
(56, 3, 2, 'Tugas persiapan 16', NULL, 1, '2026-12-26 00:00:00', 'sedang', 'todo', NULL, 1),
(57, 1, 1, 'Tugas persiapan 7', NULL, 1, '2026-09-19 00:00:00', 'sedang', 'done', NULL, 1),
(58, 1, 1, 'Tugas persiapan 17', NULL, 1, '2026-09-29 00:00:00', 'sedang', 'done', NULL, 1),
(59, 1, 1, 'Tugas persiapan 27', NULL, 1, '2026-10-09 00:00:00', 'sedang', 'in_progress', NULL, 1),
(60, 2, 3, 'Tugas persiapan 7', NULL, 1, '2026-10-14 00:00:00', 'sedang', 'done', NULL, 1),
(61, 2, 3, 'Tugas persiapan 17', NULL, 1, '2026-10-24 00:00:00', 'sedang', 'in_progress', NULL, 1),
(62, 2, 3, 'Tugas persiapan 27', NULL, 1, '2026-11-03 00:00:00', 'sedang', 'todo', NULL, 1),
(63, 3, 2, 'Tugas persiapan 7', NULL, 1, '2026-12-17 00:00:00', 'sedang', 'in_progress', NULL, 1),
(64, 3, 2, 'Tugas persiapan 17', NULL, 1, '2026-12-27 00:00:00', 'sedang', 'todo', NULL, 1),
(65, 1, 1, 'Tugas persiapan 8', NULL, 1, '2026-09-20 00:00:00', 'sedang', 'done', NULL, 1),
(66, 1, 1, 'Tugas persiapan 18', NULL, 1, '2026-09-30 00:00:00', 'sedang', 'done', NULL, 1),
(67, 1, 1, 'Tugas persiapan 28', NULL, 1, '2026-10-10 00:00:00', 'sedang', 'in_progress', NULL, 1),
(68, 2, 3, 'Tugas persiapan 8', NULL, 1, '2026-10-15 00:00:00', 'sedang', 'done', NULL, 1),
(69, 2, 3, 'Tugas persiapan 18', NULL, 1, '2026-10-25 00:00:00', 'sedang', 'in_progress', NULL, 1),
(70, 2, 3, 'Tugas persiapan 28', NULL, 1, '2026-11-04 00:00:00', 'sedang', 'todo', NULL, 1),
(71, 3, 2, 'Tugas persiapan 8', NULL, 1, '2026-12-18 00:00:00', 'sedang', 'todo', NULL, 1),
(72, 3, 2, 'Tugas persiapan 18', NULL, 1, '2026-12-28 00:00:00', 'sedang', 'todo', NULL, 1),
(73, 1, 1, 'Tugas persiapan 9', NULL, 1, '2026-09-21 00:00:00', 'sedang', 'done', NULL, 1),
(74, 1, 1, 'Tugas persiapan 19', NULL, 1, '2026-10-01 00:00:00', 'sedang', 'done', NULL, 1),
(75, 1, 1, 'Tugas persiapan 29', NULL, 1, '2026-10-11 00:00:00', 'sedang', 'todo', NULL, 1),
(76, 2, 3, 'Tugas persiapan 9', NULL, 1, '2026-10-16 00:00:00', 'sedang', 'done', NULL, 1),
(77, 2, 3, 'Tugas persiapan 19', NULL, 1, '2026-10-26 00:00:00', 'sedang', 'todo', NULL, 1),
(78, 2, 3, 'Tugas persiapan 29', NULL, 1, '2026-11-05 00:00:00', 'sedang', 'todo', NULL, 1),
(79, 3, 2, 'Tugas persiapan 9', NULL, 1, '2026-12-19 00:00:00', 'sedang', 'todo', NULL, 1),
(80, 3, 2, 'Tugas persiapan 19', NULL, 1, '2026-12-29 00:00:00', 'sedang', 'todo', NULL, 1),
(81, 1, 1, 'Tugas persiapan 10', NULL, 1, '2026-09-22 00:00:00', 'sedang', 'done', NULL, 1),
(82, 1, 1, 'Tugas persiapan 20', NULL, 1, '2026-10-02 00:00:00', 'sedang', 'done', NULL, 1),
(83, 1, 1, 'Tugas persiapan 30', NULL, 1, '2026-10-12 00:00:00', 'sedang', 'todo', NULL, 1),
(84, 2, 3, 'Tugas persiapan 10', NULL, 1, '2026-10-17 00:00:00', 'sedang', 'done', NULL, 1),
(85, 2, 3, 'Tugas persiapan 20', NULL, 1, '2026-10-27 00:00:00', 'sedang', 'todo', NULL, 1),
(86, 2, 3, 'Tugas persiapan 30', NULL, 1, '2026-11-06 00:00:00', 'sedang', 'todo', NULL, 1),
(87, 3, 2, 'Tugas persiapan 10', NULL, 1, '2026-12-20 00:00:00', 'sedang', 'todo', NULL, 1),
(88, 3, 2, 'Tugas persiapan 20', NULL, 1, '2026-12-30 00:00:00', 'sedang', 'todo', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `task_attachments`
--

CREATE TABLE `task_attachments` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `catatan` text NOT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `dibuat_oleh` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `nama`, `email`, `password`, `created_at`) VALUES
(1, 'Jzakyla Dwi Maharani', 'zakiladwi041@gmail.com', '$2b$10$umyAHU89US2/C3.xlu4AMucBYuVD072IjdQ9xjGI7c37OhglyAfEe', '2026-10-06 15:29:11'),
(2, 'Muhammad Fery Arifiansyah', 'fery@contoh.id', 'BELUM-DI-HASH', '2026-10-06 15:29:11'),
(3, 'Rafif Ramadhan', 'rafif@contoh.id', 'x', '2026-10-06 16:08:38'),
(4, 'Omar Justice', 'omar@contoh.id', 'x', '2026-10-06 16:08:38'),
(6, 'Kyla Putri', 'kyla@contoh.id', 'x', '2026-10-06 16:08:38'),
(7, 'Mira Rahma', 'mira@contoh.id', 'x', '2026-10-06 16:08:38');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `action_items`
--
ALTER TABLE `action_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `minute_id` (`minute_id`),
  ADD KEY `task_id` (`task_id`);

--
-- Indexes for table `attendances`
--
ALTER TABLE `attendances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_hadir` (`session_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `attendance_sessions`
--
ALTER TABLE `attendance_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `meeting_id` (`meeting_id`),
  ADD KEY `dibuka_oleh` (`dibuka_oleh`);

--
-- Indexes for table `budget_items`
--
ALTER TABLE `budget_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`),
  ADD KEY `division_id` (`division_id`);

--
-- Indexes for table `divisions`
--
ALTER TABLE `divisions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `dibuat_oleh` (`dibuat_oleh`);

--
-- Indexes for table `event_members`
--
ALTER TABLE `event_members`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `budget_item_id` (`budget_item_id`),
  ADD KEY `diajukan_oleh` (`diajukan_oleh`),
  ADD KEY `diverifikasi_oleh` (`diverifikasi_oleh`);

--
-- Indexes for table `incomes`
--
ALTER TABLE `incomes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`),
  ADD KEY `dicatat_oleh` (`dicatat_oleh`);

--
-- Indexes for table `invitations`
--
ALTER TABLE `invitations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `kode` (`kode`),
  ADD KEY `event_id` (`event_id`),
  ADD KEY `dibuat_oleh` (`dibuat_oleh`);

--
-- Indexes for table `meetings`
--
ALTER TABLE `meetings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`),
  ADD KEY `dibuat_oleh` (`dibuat_oleh`);

--
-- Indexes for table `meeting_minutes`
--
ALTER TABLE `meeting_minutes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `meeting_id` (`meeting_id`),
  ADD KEY `dibuat_oleh` (`dibuat_oleh`);

--
-- Indexes for table `meeting_participants`
--
ALTER TABLE `meeting_participants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_peserta` (`meeting_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`),
  ADD KEY `division_id` (`division_id`),
  ADD KEY `penanggung_jawab_id` (`penanggung_jawab_id`),
  ADD KEY `dibuat_oleh` (`dibuat_oleh`);

--
-- Indexes for table `task_attachments`
--
ALTER TABLE `task_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `task_id` (`task_id`),
  ADD KEY `dibuat_oleh` (`dibuat_oleh`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `action_items`
--
ALTER TABLE `action_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendances`
--
ALTER TABLE `attendances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance_sessions`
--
ALTER TABLE `attendance_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `budget_items`
--
ALTER TABLE `budget_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `divisions`
--
ALTER TABLE `divisions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `event_members`
--
ALTER TABLE `event_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `incomes`
--
ALTER TABLE `incomes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `invitations`
--
ALTER TABLE `invitations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `meetings`
--
ALTER TABLE `meetings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `meeting_minutes`
--
ALTER TABLE `meeting_minutes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `meeting_participants`
--
ALTER TABLE `meeting_participants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=89;

--
-- AUTO_INCREMENT for table `task_attachments`
--
ALTER TABLE `task_attachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `action_items`
--
ALTER TABLE `action_items`
  ADD CONSTRAINT `action_items_ibfk_1` FOREIGN KEY (`minute_id`) REFERENCES `meeting_minutes` (`id`),
  ADD CONSTRAINT `action_items_ibfk_2` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`);

--
-- Constraints for table `attendances`
--
ALTER TABLE `attendances`
  ADD CONSTRAINT `attendances_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions` (`id`),
  ADD CONSTRAINT `attendances_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `attendance_sessions`
--
ALTER TABLE `attendance_sessions`
  ADD CONSTRAINT `attendance_sessions_ibfk_1` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`),
  ADD CONSTRAINT `attendance_sessions_ibfk_2` FOREIGN KEY (`dibuka_oleh`) REFERENCES `users` (`id`);

--
-- Constraints for table `budget_items`
--
ALTER TABLE `budget_items`
  ADD CONSTRAINT `budget_items_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`),
  ADD CONSTRAINT `budget_items_ibfk_2` FOREIGN KEY (`division_id`) REFERENCES `divisions` (`id`);

--
-- Constraints for table `divisions`
--
ALTER TABLE `divisions`
  ADD CONSTRAINT `divisions_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`);

--
-- Constraints for table `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `events_ibfk_1` FOREIGN KEY (`dibuat_oleh`) REFERENCES `users` (`id`);

--
-- Constraints for table `event_members`
--
ALTER TABLE `event_members`
  ADD CONSTRAINT `event_members_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `event_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`budget_item_id`) REFERENCES `budget_items` (`id`),
  ADD CONSTRAINT `expenses_ibfk_2` FOREIGN KEY (`diajukan_oleh`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `expenses_ibfk_3` FOREIGN KEY (`diverifikasi_oleh`) REFERENCES `users` (`id`);

--
-- Constraints for table `incomes`
--
ALTER TABLE `incomes`
  ADD CONSTRAINT `incomes_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`),
  ADD CONSTRAINT `incomes_ibfk_2` FOREIGN KEY (`dicatat_oleh`) REFERENCES `users` (`id`);

--
-- Constraints for table `invitations`
--
ALTER TABLE `invitations`
  ADD CONSTRAINT `invitations_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`),
  ADD CONSTRAINT `invitations_ibfk_2` FOREIGN KEY (`dibuat_oleh`) REFERENCES `users` (`id`);

--
-- Constraints for table `meetings`
--
ALTER TABLE `meetings`
  ADD CONSTRAINT `meetings_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`),
  ADD CONSTRAINT `meetings_ibfk_2` FOREIGN KEY (`dibuat_oleh`) REFERENCES `users` (`id`);

--
-- Constraints for table `meeting_minutes`
--
ALTER TABLE `meeting_minutes`
  ADD CONSTRAINT `meeting_minutes_ibfk_1` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`),
  ADD CONSTRAINT `meeting_minutes_ibfk_2` FOREIGN KEY (`dibuat_oleh`) REFERENCES `users` (`id`);

--
-- Constraints for table `meeting_participants`
--
ALTER TABLE `meeting_participants`
  ADD CONSTRAINT `meeting_participants_ibfk_1` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`),
  ADD CONSTRAINT `meeting_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`),
  ADD CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`division_id`) REFERENCES `divisions` (`id`),
  ADD CONSTRAINT `tasks_ibfk_3` FOREIGN KEY (`penanggung_jawab_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `tasks_ibfk_4` FOREIGN KEY (`dibuat_oleh`) REFERENCES `users` (`id`);

--
-- Constraints for table `task_attachments`
--
ALTER TABLE `task_attachments`
  ADD CONSTRAINT `task_attachments_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  ADD CONSTRAINT `task_attachments_ibfk_2` FOREIGN KEY (`dibuat_oleh`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
