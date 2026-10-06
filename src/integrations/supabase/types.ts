export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bacaan_notulensi: {
        Row: {
          dibaca_pada: string
          notulensi_id: string
          pengurus_id: string
        }
        Insert: {
          dibaca_pada?: string
          notulensi_id: string
          pengurus_id: string
        }
        Update: {
          dibaca_pada?: string
          notulensi_id?: string
          pengurus_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bacaan_notulensi_notulensi_id_fkey"
            columns: ["notulensi_id"]
            isOneToOne: false
            referencedRelation: "notulensi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bacaan_notulensi_notulensi_id_fkey"
            columns: ["notulensi_id"]
            isOneToOne: false
            referencedRelation: "notulensi_publik_ringkas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bacaan_notulensi_pengurus_id_fkey"
            columns: ["pengurus_id"]
            isOneToOne: false
            referencedRelation: "pengurus"
            referencedColumns: ["id"]
          },
        ]
      }
      komentar: {
        Row: {
          dibuat_pada: string
          id: string
          induk_id: string | null
          isi: string
          notulensi_id: string
          pengurus_id: string | null
          penulis_jabatan: string | null
          penulis_nama: string
        }
        Insert: {
          dibuat_pada?: string
          id?: string
          induk_id?: string | null
          isi: string
          notulensi_id: string
          pengurus_id?: string | null
          penulis_jabatan?: string | null
          penulis_nama: string
        }
        Update: {
          dibuat_pada?: string
          id?: string
          induk_id?: string | null
          isi?: string
          notulensi_id?: string
          pengurus_id?: string | null
          penulis_jabatan?: string | null
          penulis_nama?: string
        }
        Relationships: [
          {
            foreignKeyName: "komentar_induk_id_fkey"
            columns: ["induk_id"]
            isOneToOne: false
            referencedRelation: "komentar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "komentar_notulensi_id_fkey"
            columns: ["notulensi_id"]
            isOneToOne: false
            referencedRelation: "notulensi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "komentar_notulensi_id_fkey"
            columns: ["notulensi_id"]
            isOneToOne: false
            referencedRelation: "notulensi_publik_ringkas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "komentar_pengurus_id_fkey"
            columns: ["pengurus_id"]
            isOneToOne: false
            referencedRelation: "pengurus"
            referencedColumns: ["id"]
          },
        ]
      }
      log_audit: {
        Row: {
          aksi: string
          email: string
          entitas: string
          entitas_id: string | null
          id: number
          ringkasan: string | null
          waktu: string | null
        }
        Insert: {
          aksi: string
          email: string
          entitas: string
          entitas_id?: string | null
          id?: number
          ringkasan?: string | null
          waktu?: string | null
        }
        Update: {
          aksi?: string
          email?: string
          entitas?: string
          entitas_id?: string | null
          id?: number
          ringkasan?: string | null
          waktu?: string | null
        }
        Relationships: []
      }
      notifikasi: {
        Row: {
          dibaca_pada: string | null
          dibuat_pada: string
          id: string
          jenis: string
          judul: string
          komentar_id: string | null
          notulensi_id: string | null
          pengurus_id: string
          pesan: string | null
          tautan: string | null
        }
        Insert: {
          dibaca_pada?: string | null
          dibuat_pada?: string
          id?: string
          jenis?: string
          judul: string
          komentar_id?: string | null
          notulensi_id?: string | null
          pengurus_id: string
          pesan?: string | null
          tautan?: string | null
        }
        Update: {
          dibaca_pada?: string | null
          dibuat_pada?: string
          id?: string
          jenis?: string
          judul?: string
          komentar_id?: string | null
          notulensi_id?: string | null
          pengurus_id?: string
          pesan?: string | null
          tautan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifikasi_komentar_id_fkey"
            columns: ["komentar_id"]
            isOneToOne: false
            referencedRelation: "komentar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifikasi_notulensi_id_fkey"
            columns: ["notulensi_id"]
            isOneToOne: false
            referencedRelation: "notulensi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifikasi_notulensi_id_fkey"
            columns: ["notulensi_id"]
            isOneToOne: false
            referencedRelation: "notulensi_publik_ringkas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifikasi_pengurus_id_fkey"
            columns: ["pengurus_id"]
            isOneToOne: false
            referencedRelation: "pengurus"
            referencedColumns: ["id"]
          },
        ]
      }
      notulensi: {
        Row: {
          anggaran: number | null
          berkas_path: string | null
          catatan_penolakan: string | null
          dibuat_oleh: string
          dibuat_pada: string | null
          dihapus_pada: string | null
          disetujui_oleh: string | null
          diterbitkan_pada: string | null
          diubah_oleh: string | null
          diubah_pada: string | null
          hal_urgen: string | null
          hal_urgen_tampil: Database["public"]["Enums"]["tampil_hal_urgen"]
          id: string
          induk_id: string | null
          keputusan: string | null
          link_lampiran: string | null
          nama_berkas_asli: string | null
          nomor: string | null
          notulis: string | null
          pembahasan: string
          pemimpin: string | null
          status_publikasi: Database["public"]["Enums"]["status_publikasi"]
          tanggal: string
          tema: string
          tempat: string | null
          visibilitas: Database["public"]["Enums"]["visibilitas_notulensi"]
          waktu_mulai: string | null
          waktu_selesai: string | null
        }
        Insert: {
          anggaran?: number | null
          berkas_path?: string | null
          catatan_penolakan?: string | null
          dibuat_oleh: string
          dibuat_pada?: string | null
          dihapus_pada?: string | null
          disetujui_oleh?: string | null
          diterbitkan_pada?: string | null
          diubah_oleh?: string | null
          diubah_pada?: string | null
          hal_urgen?: string | null
          hal_urgen_tampil?: Database["public"]["Enums"]["tampil_hal_urgen"]
          id?: string
          induk_id?: string | null
          keputusan?: string | null
          link_lampiran?: string | null
          nama_berkas_asli?: string | null
          nomor?: string | null
          notulis?: string | null
          pembahasan?: string
          pemimpin?: string | null
          status_publikasi?: Database["public"]["Enums"]["status_publikasi"]
          tanggal: string
          tema: string
          tempat?: string | null
          visibilitas?: Database["public"]["Enums"]["visibilitas_notulensi"]
          waktu_mulai?: string | null
          waktu_selesai?: string | null
        }
        Update: {
          anggaran?: number | null
          berkas_path?: string | null
          catatan_penolakan?: string | null
          dibuat_oleh?: string
          dibuat_pada?: string | null
          dihapus_pada?: string | null
          disetujui_oleh?: string | null
          diterbitkan_pada?: string | null
          diubah_oleh?: string | null
          diubah_pada?: string | null
          hal_urgen?: string | null
          hal_urgen_tampil?: Database["public"]["Enums"]["tampil_hal_urgen"]
          id?: string
          induk_id?: string | null
          keputusan?: string | null
          link_lampiran?: string | null
          nama_berkas_asli?: string | null
          nomor?: string | null
          notulis?: string | null
          pembahasan?: string
          pemimpin?: string | null
          status_publikasi?: Database["public"]["Enums"]["status_publikasi"]
          tanggal?: string
          tema?: string
          tempat?: string | null
          visibilitas?: Database["public"]["Enums"]["visibilitas_notulensi"]
          waktu_mulai?: string | null
          waktu_selesai?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notulensi_induk_id_fkey"
            columns: ["induk_id"]
            isOneToOne: false
            referencedRelation: "notulensi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notulensi_induk_id_fkey"
            columns: ["induk_id"]
            isOneToOne: false
            referencedRelation: "notulensi_publik_ringkas"
            referencedColumns: ["id"]
          },
        ]
      }
      pengaturan: {
        Row: {
          dibuat_pada: string
          diubah_pada: string
          keterangan: string | null
          kunci: string
          nilai: string
        }
        Insert: {
          dibuat_pada?: string
          diubah_pada?: string
          keterangan?: string | null
          kunci: string
          nilai: string
        }
        Update: {
          dibuat_pada?: string
          diubah_pada?: string
          keterangan?: string | null
          kunci?: string
          nilai?: string
        }
        Relationships: []
      }
      pengurus: {
        Row: {
          aktif: boolean
          dibuat_pada: string | null
          email: string
          id: string
          jabatan: string | null
          nama_lengkap: string
          no_wa: string | null
          peran: Database["public"]["Enums"]["peran_pengurus"]
          user_id: string | null
          username: string | null
        }
        Insert: {
          aktif?: boolean
          dibuat_pada?: string | null
          email: string
          id?: string
          jabatan?: string | null
          nama_lengkap: string
          no_wa?: string | null
          peran?: Database["public"]["Enums"]["peran_pengurus"]
          user_id?: string | null
          username?: string | null
        }
        Update: {
          aktif?: boolean
          dibuat_pada?: string | null
          email?: string
          id?: string
          jabatan?: string | null
          nama_lengkap?: string
          no_wa?: string | null
          peran?: Database["public"]["Enums"]["peran_pengurus"]
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      peserta: {
        Row: {
          id: string
          jabatan: string | null
          kehadiran: Database["public"]["Enums"]["kehadiran_peserta"]
          nama: string
          notulensi_id: string
        }
        Insert: {
          id?: string
          jabatan?: string | null
          kehadiran?: Database["public"]["Enums"]["kehadiran_peserta"]
          nama: string
          notulensi_id: string
        }
        Update: {
          id?: string
          jabatan?: string | null
          kehadiran?: Database["public"]["Enums"]["kehadiran_peserta"]
          nama?: string
          notulensi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peserta_notulensi_id_fkey"
            columns: ["notulensi_id"]
            isOneToOne: false
            referencedRelation: "notulensi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peserta_notulensi_id_fkey"
            columns: ["notulensi_id"]
            isOneToOne: false
            referencedRelation: "notulensi_publik_ringkas"
            referencedColumns: ["id"]
          },
        ]
      }
      rahasia_ai: {
        Row: {
          diubah_oleh: string | null
          diubah_pada: string
          id: boolean
          kunci_google: string | null
          pin_situs: string | null
        }
        Insert: {
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: boolean
          kunci_google?: string | null
          pin_situs?: string | null
        }
        Update: {
          diubah_oleh?: string | null
          diubah_pada?: string
          id?: boolean
          kunci_google?: string | null
          pin_situs?: string | null
        }
        Relationships: []
      }
      reaksi_komentar: {
        Row: {
          dibuat_pada: string
          emoji: string
          id: string
          komentar_id: string
          pengurus_id: string
        }
        Insert: {
          dibuat_pada?: string
          emoji: string
          id?: string
          komentar_id: string
          pengurus_id: string
        }
        Update: {
          dibuat_pada?: string
          emoji?: string
          id?: string
          komentar_id?: string
          pengurus_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reaksi_komentar_komentar_id_fkey"
            columns: ["komentar_id"]
            isOneToOne: false
            referencedRelation: "komentar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reaksi_komentar_pengurus_id_fkey"
            columns: ["pengurus_id"]
            isOneToOne: false
            referencedRelation: "pengurus"
            referencedColumns: ["id"]
          },
        ]
      }
      tindak_lanjut: {
        Row: {
          catatan: string | null
          deadline: string | null
          id: string
          notulensi_id: string
          pj_id: string | null
          pj_nama: string | null
          selesai_pada: string | null
          status: Database["public"]["Enums"]["status_tindak_lanjut"]
          tugas: string
          urutan: number
        }
        Insert: {
          catatan?: string | null
          deadline?: string | null
          id?: string
          notulensi_id: string
          pj_id?: string | null
          pj_nama?: string | null
          selesai_pada?: string | null
          status?: Database["public"]["Enums"]["status_tindak_lanjut"]
          tugas: string
          urutan?: number
        }
        Update: {
          catatan?: string | null
          deadline?: string | null
          id?: string
          notulensi_id?: string
          pj_id?: string | null
          pj_nama?: string | null
          selesai_pada?: string | null
          status?: Database["public"]["Enums"]["status_tindak_lanjut"]
          tugas?: string
          urutan?: number
        }
        Relationships: [
          {
            foreignKeyName: "tindak_lanjut_notulensi_id_fkey"
            columns: ["notulensi_id"]
            isOneToOne: false
            referencedRelation: "notulensi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tindak_lanjut_notulensi_id_fkey"
            columns: ["notulensi_id"]
            isOneToOne: false
            referencedRelation: "notulensi_publik_ringkas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tindak_lanjut_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "pengurus"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      notulensi_publik_ringkas: {
        Row: {
          ada_lanjutan: boolean | null
          cuplikan: string | null
          daftar_pj: string[] | null
          diterbitkan_pada: string | null
          hal_urgen: string | null
          hal_urgen_tampil:
            | Database["public"]["Enums"]["tampil_hal_urgen"]
            | null
          id: string | null
          nomor: string | null
          status_tindak_lanjut: string[] | null
          tanggal: string | null
          tema: string | null
        }
        Insert: {
          ada_lanjutan?: never
          cuplikan?: never
          daftar_pj?: never
          diterbitkan_pada?: string | null
          hal_urgen?: string | null
          hal_urgen_tampil?:
            | Database["public"]["Enums"]["tampil_hal_urgen"]
            | null
          id?: string | null
          nomor?: string | null
          status_tindak_lanjut?: never
          tanggal?: string | null
          tema?: string | null
        }
        Update: {
          ada_lanjutan?: never
          cuplikan?: never
          daftar_pj?: never
          diterbitkan_pada?: string | null
          hal_urgen?: string | null
          hal_urgen_tampil?:
            | Database["public"]["Enums"]["tampil_hal_urgen"]
            | null
          id?: string | null
          nomor?: string | null
          status_tindak_lanjut?: never
          tanggal?: string | null
          tema?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      kehadiran_peserta: "Hadir" | "Izin" | "Tidak Hadir"
      peran_pengurus: "editor" | "approver"
      status_publikasi: "draft" | "menunggu" | "terbit"
      status_tindak_lanjut:
        | "Belum dibahas"
        | "Butuh Tindak Lanjut"
        | "Sudah dibahas"
      tampil_hal_urgen: "tidak" | "disorot" | "teks_berjalan"
      visibilitas_notulensi: "internal" | "publik"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      kehadiran_peserta: ["Hadir", "Izin", "Tidak Hadir"],
      peran_pengurus: ["editor", "approver"],
      status_publikasi: ["draft", "menunggu", "terbit"],
      status_tindak_lanjut: [
        "Belum dibahas",
        "Butuh Tindak Lanjut",
        "Sudah dibahas",
      ],
      tampil_hal_urgen: ["tidak", "disorot", "teks_berjalan"],
      visibilitas_notulensi: ["internal", "publik"],
    },
  },
} as const
