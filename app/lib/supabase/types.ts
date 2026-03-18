export type SubscriptionStatus = "none" | "active" | "cancelled" | "pending";

export type SummaryStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "transcribing"
  | "summarizing"
  | "completed"
  | "failed";

export type PaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "refunded"
  | "cancelled";

export type PaymentType = "single" | "subscription";

export type TokenOperation = "transcription" | "summarization";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  subscription_status: SubscriptionStatus;
  subscription_id: string | null;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Notebook = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Summary = {
  id: string;
  notebook_id: string;
  user_id: string;
  title: string;
  transcript_text: string | null;
  summary_markdown: string | null;
  video_duration_seconds: number | null;
  status: SummaryStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  user_id: string;
  summary_id: string | null;
  mp_payment_id: string | null;
  mp_preference_id: string | null;
  mp_preapproval_id: string | null;
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
};

export type TokenUsage = {
  id: string;
  user_id: string;
  summary_id: string | null;
  operation: TokenOperation;
  model: string;
  input_tokens: number;
  output_tokens: number;
  audio_duration_seconds: number;
  estimated_cost_usd: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          subscription_status: SubscriptionStatus;
          subscription_id: string | null;
          subscription_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          subscription_status?: SubscriptionStatus;
          subscription_id?: string | null;
          subscription_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          subscription_status?: SubscriptionStatus;
          subscription_id?: string | null;
          subscription_expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      notebooks: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      summaries: {
        Row: {
          id: string;
          notebook_id: string;
          user_id: string;
          title: string;
          transcript_text: string | null;
          summary_markdown: string | null;
          video_duration_seconds: number | null;
          status: SummaryStatus;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          notebook_id: string;
          user_id: string;
          title: string;
          transcript_text?: string | null;
          summary_markdown?: string | null;
          video_duration_seconds?: number | null;
          status?: SummaryStatus;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          notebook_id?: string;
          title?: string;
          transcript_text?: string | null;
          summary_markdown?: string | null;
          video_duration_seconds?: number | null;
          status?: SummaryStatus;
          error_message?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          summary_id: string | null;
          mp_payment_id: string | null;
          mp_preference_id: string | null;
          mp_preapproval_id: string | null;
          type: PaymentType;
          amount: number;
          currency: string;
          status: PaymentStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          summary_id?: string | null;
          mp_payment_id?: string | null;
          mp_preference_id?: string | null;
          mp_preapproval_id?: string | null;
          type: PaymentType;
          amount: number;
          currency?: string;
          status?: PaymentStatus;
          created_at?: string;
        };
        Update: {
          summary_id?: string | null;
          mp_payment_id?: string | null;
          mp_preference_id?: string | null;
          mp_preapproval_id?: string | null;
          type?: PaymentType;
          amount?: number;
          currency?: string;
          status?: PaymentStatus;
        };
        Relationships: [];
      };
      token_usage: {
        Row: {
          id: string;
          user_id: string;
          summary_id: string | null;
          operation: TokenOperation;
          model: string;
          input_tokens: number;
          output_tokens: number;
          audio_duration_seconds: number;
          estimated_cost_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          summary_id?: string | null;
          operation: TokenOperation;
          model: string;
          input_tokens?: number;
          output_tokens?: number;
          audio_duration_seconds?: number;
          estimated_cost_usd?: number;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
  };
};
