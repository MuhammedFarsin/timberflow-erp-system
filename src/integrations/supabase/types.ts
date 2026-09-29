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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      business_users: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_branch: string | null
          bank_ifsc: string | null
          bank_name: string | null
          cft_divisor: number
          cft_rounding: number
          city: string | null
          created_at: string
          default_allowance: number
          email: string | null
          grade1_min: number
          grade1_rate: number
          grade2_min: number
          grade2_rate: number
          grade3_rate: number
          gst_rate: number
          gstin: string | null
          id: string
          invoice_footer: string | null
          invoice_prefix: string
          legal_name: string | null
          logo_url: string | null
          low_stock_cft: number
          name: string
          pan: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          state_code: string | null
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          cft_divisor?: number
          cft_rounding?: number
          city?: string | null
          created_at?: string
          default_allowance?: number
          email?: string | null
          grade1_min?: number
          grade1_rate?: number
          grade2_min?: number
          grade2_rate?: number
          grade3_rate?: number
          gst_rate?: number
          gstin?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_prefix?: string
          legal_name?: string | null
          logo_url?: string | null
          low_stock_cft?: number
          name?: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          cft_divisor?: number
          cft_rounding?: number
          city?: string | null
          created_at?: string
          default_allowance?: number
          email?: string | null
          grade1_min?: number
          grade1_rate?: number
          grade2_min?: number
          grade2_rate?: number
          grade3_rate?: number
          gst_rate?: number
          gstin?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_prefix?: string
          legal_name?: string | null
          logo_url?: string | null
          low_stock_cft?: number
          name?: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          name: string
          phone: string | null
          state: string | null
          state_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          phone?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          phone?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          attachment_url: string | null
          business_id: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          business_id: string
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          business_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          business_id: string
          cgst: number
          created_at: string
          customer_id: string | null
          financial_year: string
          id: string
          igst: number
          invoice_date: string
          invoice_number: string
          prefix: string
          round_off: number
          sale_id: string | null
          sequence_number: number
          sgst: number
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          business_id: string
          cgst?: number
          created_at?: string
          customer_id?: string | null
          financial_year: string
          id?: string
          igst?: number
          invoice_date?: string
          invoice_number: string
          prefix?: string
          round_off?: number
          sale_id?: string | null
          sequence_number: number
          sgst?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          cgst?: number
          created_at?: string
          customer_id?: string | null
          financial_year?: string
          id?: string
          igst?: number
          invoice_date?: string
          invoice_number?: string
          prefix?: string
          round_off?: number
          sale_id?: string | null
          sequence_number?: number
          sgst?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_logs: {
        Row: {
          allowance_in: number
          amount: number
          business_id: string
          cft: number
          created_at: string
          custom_rate: boolean
          effective_girth: number
          girth_in: number
          grade: string
          id: string
          length_ft: number
          log_no: number
          purchase_id: string
          rate: number
        }
        Insert: {
          allowance_in?: number
          amount: number
          business_id: string
          cft: number
          created_at?: string
          custom_rate?: boolean
          effective_girth: number
          girth_in: number
          grade: string
          id?: string
          length_ft: number
          log_no: number
          purchase_id: string
          rate: number
        }
        Update: {
          allowance_in?: number
          amount?: number
          business_id?: string
          cft?: number
          created_at?: string
          custom_rate?: boolean
          effective_girth?: number
          girth_in?: number
          grade?: string
          id?: string
          length_ft?: number
          log_no?: number
          purchase_id?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_logs_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          purchase_id: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          purchase_id: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_paid: number
          business_id: string
          created_at: string
          created_by: string | null
          discount: number
          final_amount: number
          id: string
          loading_charges: number
          notes: string | null
          other_charges: number
          payment_method: string | null
          purchase_date: string
          purchase_number: string
          status: string
          stock_applied: boolean
          supplier_id: string | null
          timber_value: number
          total_cft: number
          total_logs: number
          transport_charges: number
          unloading_charges: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_paid?: number
          business_id: string
          created_at?: string
          created_by?: string | null
          discount?: number
          final_amount?: number
          id?: string
          loading_charges?: number
          notes?: string | null
          other_charges?: number
          payment_method?: string | null
          purchase_date?: string
          purchase_number: string
          status?: string
          stock_applied?: boolean
          supplier_id?: string | null
          timber_value?: number
          total_cft?: number
          total_logs?: number
          transport_charges?: number
          unloading_charges?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_paid?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          discount?: number
          final_amount?: number
          id?: string
          loading_charges?: number
          notes?: string | null
          other_charges?: number
          payment_method?: string | null
          purchase_date?: string
          purchase_number?: string
          status?: string
          stock_applied?: boolean
          supplier_id?: string | null
          timber_value?: number
          total_cft?: number
          total_logs?: number
          transport_charges?: number
          unloading_charges?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          amount: number
          business_id: string
          cft: number
          created_at: string
          grade: string | null
          id: string
          item_type: string
          product_name: string | null
          quantity: number
          rate: number
          sale_id: string
          size_label: string | null
        }
        Insert: {
          amount?: number
          business_id: string
          cft?: number
          created_at?: string
          grade?: string | null
          id?: string
          item_type?: string
          product_name?: string | null
          quantity?: number
          rate?: number
          sale_id: string
          size_label?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          cft?: number
          created_at?: string
          grade?: string | null
          id?: string
          item_type?: string
          product_name?: string | null
          quantity?: number
          rate?: number
          sale_id?: string
          size_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          business_id: string
          cgst: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          gst_rate: number
          id: string
          igst: number
          is_interstate: boolean
          notes: string | null
          payment_method: string | null
          payment_status: string
          round_off: number
          sale_date: string
          sale_number: string
          sale_type: string
          sgst: number
          subtotal: number
          total: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_paid?: number
          business_id: string
          cgst?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          gst_rate?: number
          id?: string
          igst?: number
          is_interstate?: boolean
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          round_off?: number
          sale_date?: string
          sale_number: string
          sale_type?: string
          sgst?: number
          subtotal?: number
          total?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_paid?: number
          business_id?: string
          cgst?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          gst_rate?: number
          id?: string
          igst?: number
          is_interstate?: boolean
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          round_off?: number
          sale_date?: string
          sale_number?: string
          sale_type?: string
          sgst?: number
          subtotal?: number
          total?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          avg_rate: number
          business_id: string
          cft: number
          grade: string | null
          id: string
          item_type: string
          low_threshold: number
          product_name: string | null
          quantity: number
          updated_at: string
        }
        Insert: {
          avg_rate?: number
          business_id: string
          cft?: number
          grade?: string | null
          id?: string
          item_type?: string
          low_threshold?: number
          product_name?: string | null
          quantity?: number
          updated_at?: string
        }
        Update: {
          avg_rate?: number
          business_id?: string
          cft?: number
          grade?: string | null
          id?: string
          item_type?: string
          low_threshold?: number
          product_name?: string | null
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          business_id: string
          cft_change: number
          created_at: string
          created_by: string | null
          grade: string | null
          id: string
          item_type: string
          movement_type: string
          notes: string | null
          product_name: string | null
          qty_change: number
          reference: string | null
          updated_by: string | null
        }
        Insert: {
          business_id: string
          cft_change?: number
          created_at?: string
          created_by?: string | null
          grade?: string | null
          id?: string
          item_type?: string
          movement_type: string
          notes?: string | null
          product_name?: string | null
          qty_change?: number
          reference?: string | null
          updated_by?: string | null
        }
        Update: {
          business_id?: string
          cft_change?: number
          created_at?: string
          created_by?: string | null
          grade?: string | null
          id?: string
          item_type?: string
          movement_type?: string
          notes?: string | null
          product_name?: string | null
          qty_change?: number
          reference?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_stock: {
        Row: {
          business_id: string
          cft: number
          created_at: string
          expected_date: string | null
          grade: string
          id: string
          logs: number
          purchase_id: string | null
        }
        Insert: {
          business_id: string
          cft?: number
          created_at?: string
          expected_date?: string | null
          grade: string
          id?: string
          logs?: number
          purchase_id?: string | null
        }
        Update: {
          business_id?: string
          cft?: number
          created_at?: string
          expected_date?: string | null
          grade?: string
          id?: string
          logs?: number
          purchase_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upcoming_stock_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upcoming_stock_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      wage_payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          id: string
          method: string | null
          paid_on: string
          wage_id: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          id?: string
          method?: string | null
          paid_on?: string
          wage_id: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          id?: string
          method?: string | null
          paid_on?: string
          wage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wage_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wage_payments_wage_id_fkey"
            columns: ["wage_id"]
            isOneToOne: false
            referencedRelation: "worker_wages"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_wages: {
        Row: {
          advance: number
          amount_paid: number
          base_wage: number
          bonus: number
          business_id: string
          created_at: string
          deduction: number
          final_wage: number
          id: string
          notes: string | null
          overtime: number
          payment_status: string
          updated_at: string
          wage_date: string
          wage_type: string
          worker_id: string
        }
        Insert: {
          advance?: number
          amount_paid?: number
          base_wage?: number
          bonus?: number
          business_id: string
          created_at?: string
          deduction?: number
          final_wage?: number
          id?: string
          notes?: string | null
          overtime?: number
          payment_status?: string
          updated_at?: string
          wage_date?: string
          wage_type?: string
          worker_id: string
        }
        Update: {
          advance?: number
          amount_paid?: number
          base_wage?: number
          bonus?: number
          business_id?: string
          created_at?: string
          deduction?: number
          final_wage?: number
          id?: string
          notes?: string | null
          overtime?: number
          payment_status?: string
          updated_at?: string
          wage_date?: string
          wage_type?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_wages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_wages_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          daily_wage: number
          id: string
          name: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          daily_wage?: number
          id?: string
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          daily_wage?: number
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_sale: { Args: { _payload: Json }; Returns: Json }
      ensure_business: { Args: { _name?: string }; Returns: string }
      is_member: { Args: { _business_id: string }; Returns: boolean }
      is_owner: { Args: { _business_id: string }; Returns: boolean }
      receive_purchase: { Args: { _purchase_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
