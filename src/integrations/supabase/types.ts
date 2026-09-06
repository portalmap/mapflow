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
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_executions: {
        Row: {
          automation_id: string
          executed_at: string
          id: string
          status_id: string | null
          task_id: string
        }
        Insert: {
          automation_id: string
          executed_at?: string
          id?: string
          status_id?: string | null
          task_id: string
        }
        Update: {
          automation_id?: string
          executed_at?: string
          id?: string
          status_id?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          automation_id: string
          error_message: string | null
          executed_at: string
          id: string
          status: string
          task_id: string | null
        }
        Insert: {
          automation_id: string
          error_message?: string | null
          executed_at?: string
          id?: string
          status: string
          task_id?: string | null
        }
        Update: {
          automation_id?: string
          error_message?: string | null
          executed_at?: string
          id?: string
          status?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action_config: Json
          action_type: Database["public"]["Enums"]["automation_action"]
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          scope_id: string | null
          scope_type: Database["public"]["Enums"]["automation_scope"]
          trigger: Database["public"]["Enums"]["automation_trigger"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          action_config?: Json
          action_type: Database["public"]["Enums"]["automation_action"]
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          scope_id?: string | null
          scope_type: Database["public"]["Enums"]["automation_scope"]
          trigger: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          action_config?: Json
          action_type?: Database["public"]["Enums"]["automation_action"]
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["automation_scope"]
          trigger?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_guests: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          event_id: string
          id: string
          invite_error: string | null
          invite_status: string
          invited_at: string | null
          is_organizer: boolean
          is_self: boolean
          optional: boolean
          response_status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          event_id: string
          id?: string
          invite_error?: string | null
          invite_status?: string
          invited_at?: string | null
          is_organizer?: boolean
          is_self?: boolean
          optional?: boolean
          response_status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          event_id?: string
          id?: string
          invite_error?: string | null
          invite_status?: string
          invited_at?: string | null
          is_organizer?: boolean
          is_self?: boolean
          optional?: boolean
          response_status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_reminders: {
        Row: {
          created_at: string
          event_id: string
          fire_at: string
          id: string
          notified_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          fire_at: string
          id?: string
          notified_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          fire_at?: string
          id?: string
          notified_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          auto_decline: boolean
          can_edit: boolean
          color: string
          completed_at: string | null
          conference_phone: string | null
          conference_pin: string | null
          conference_requested: boolean
          created_at: string
          deleted_at: string | null
          description: string | null
          ends_at: string
          google_calendar_id: string | null
          google_etag: string | null
          google_event_id: string | null
          google_html_link: string | null
          google_task_id: string | null
          google_task_list_id: string | null
          guests_can_invite_others: boolean
          guests_can_modify: boolean
          guests_can_see_others: boolean
          hangout_link: string | null
          id: string
          item_type: string
          last_synced_at: string | null
          location: string | null
          meet_code: string | null
          organizer_email: string | null
          organizer_name: string | null
          recurrence: string[] | null
          recurring_event_id: string | null
          reminder_minutes: number | null
          reminders: Json | null
          response_status: string | null
          source: string
          starts_at: string
          title: string
          transparency: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          all_day?: boolean
          auto_decline?: boolean
          can_edit?: boolean
          color?: string
          completed_at?: string | null
          conference_phone?: string | null
          conference_pin?: string | null
          conference_requested?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at: string
          google_calendar_id?: string | null
          google_etag?: string | null
          google_event_id?: string | null
          google_html_link?: string | null
          google_task_id?: string | null
          google_task_list_id?: string | null
          guests_can_invite_others?: boolean
          guests_can_modify?: boolean
          guests_can_see_others?: boolean
          hangout_link?: string | null
          id?: string
          item_type?: string
          last_synced_at?: string | null
          location?: string | null
          meet_code?: string | null
          organizer_email?: string | null
          organizer_name?: string | null
          recurrence?: string[] | null
          recurring_event_id?: string | null
          reminder_minutes?: number | null
          reminders?: Json | null
          response_status?: string | null
          source?: string
          starts_at: string
          title: string
          transparency?: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          all_day?: boolean
          auto_decline?: boolean
          can_edit?: boolean
          color?: string
          completed_at?: string | null
          conference_phone?: string | null
          conference_pin?: string | null
          conference_requested?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string
          google_calendar_id?: string | null
          google_etag?: string | null
          google_event_id?: string | null
          google_html_link?: string | null
          google_task_id?: string | null
          google_task_list_id?: string | null
          guests_can_invite_others?: boolean
          guests_can_modify?: boolean
          guests_can_see_others?: boolean
          hangout_link?: string | null
          id?: string
          item_type?: string
          last_synced_at?: string | null
          location?: string | null
          meet_code?: string | null
          organizer_email?: string | null
          organizer_name?: string | null
          recurrence?: string[] | null
          recurring_event_id?: string | null
          reminder_minutes?: number | null
          reminders?: Json | null
          response_status?: string | null
          source?: string
          starts_at?: string
          title?: string
          transparency?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      calendar_google_accounts: {
        Row: {
          calendar_id: string
          connected_at: string
          created_at: string
          google_email: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          status: string
          sync_cursor: Json
          sync_token: string | null
          sync_tokens: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id?: string
          connected_at?: string
          created_at?: string
          google_email?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          status?: string
          sync_cursor?: Json
          sync_token?: string | null
          sync_tokens?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          connected_at?: string
          created_at?: string
          google_email?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          status?: string
          sync_cursor?: Json
          sync_token?: string | null
          sync_tokens?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["chat_channel_role"]
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["chat_channel_role"]
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["chat_channel_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          id: string
          linked_folder_id: string | null
          linked_list_id: string | null
          linked_space_id: string | null
          linked_task_id: string | null
          name: string
          type: Database["public"]["Enums"]["chat_channel_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          id?: string
          linked_folder_id?: string | null
          linked_list_id?: string | null
          linked_space_id?: string | null
          linked_task_id?: string | null
          name: string
          type?: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          id?: string
          linked_folder_id?: string | null
          linked_list_id?: string | null
          linked_space_id?: string | null
          linked_task_id?: string | null
          name?: string
          type?: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_linked_folder_id_fkey"
            columns: ["linked_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_linked_list_id_fkey"
            columns: ["linked_list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_linked_space_id_fkey"
            columns: ["linked_space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          assignee_id: string | null
          attachments: Json | null
          channel_id: string
          content: string
          created_at: string
          edit_count: number | null
          edited_at: string | null
          id: string
          read_at: string | null
          reply_to: string | null
          resolved_at: string | null
          resolved_by: string | null
          sender_id: string
        }
        Insert: {
          assignee_id?: string | null
          attachments?: Json | null
          channel_id: string
          content: string
          created_at?: string
          edit_count?: number | null
          edited_at?: string | null
          id?: string
          read_at?: string | null
          reply_to?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_id: string
        }
        Update: {
          assignee_id?: string | null
          attachments?: Json | null
          channel_id?: string
          content?: string
          created_at?: string
          edit_count?: number | null
          edited_at?: string | null
          id?: string
          read_at?: string | null
          reply_to?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_pinned_messages: {
        Row: {
          channel_id: string
          id: string
          message_id: string
          pinned_at: string
          pinned_by: string
        }
        Insert: {
          channel_id: string
          id?: string
          message_id: string
          pinned_at?: string
          pinned_by: string
        }
        Update: {
          channel_id?: string
          id?: string
          message_id?: string
          pinned_at?: string
          pinned_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_pinned_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_read_status: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_status_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_permissions: {
        Row: {
          created_at: string
          dashboard_id: string
          id: string
          role: Database["public"]["Enums"]["permission_role"]
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dashboard_id: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dashboard_id?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_permissions_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_permissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          config: Json
          created_at: string
          created_by_user_id: string
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by_user_id: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_message_conversations: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_message_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_message_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_contributors: {
        Row: {
          created_at: string
          document_id: string
          id: string
          last_contributed_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          last_contributed_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          last_contributed_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_contributors_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_favorites: {
        Row: {
          created_at: string
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_favorites_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_wiki: boolean | null
          name: string
          parent_folder_id: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_wiki?: boolean | null
          name: string
          parent_folder_id?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_wiki?: boolean | null
          name?: string
          parent_folder_id?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      document_pages: {
        Row: {
          content: Json
          created_at: string
          document_id: string
          emoji: string | null
          id: string
          is_protected: boolean | null
          parent_page_id: string | null
          position: number | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          document_id: string
          emoji?: string | null
          id?: string
          is_protected?: boolean | null
          parent_page_id?: string | null
          position?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          document_id?: string
          emoji?: string | null
          id?: string
          is_protected?: boolean | null
          parent_page_id?: string | null
          position?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_pages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_pages_parent_page_id_fkey"
            columns: ["parent_page_id"]
            isOneToOne: false
            referencedRelation: "document_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      document_permissions: {
        Row: {
          created_at: string
          document_id: string
          id: string
          role: Database["public"]["Enums"]["permission_role"]
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_permissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_permissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tag_relations: {
        Row: {
          created_at: string
          document_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_tag_relations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "document_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: Json
          cover_url: string | null
          created_at: string
          created_by_user_id: string
          emoji: string | null
          folder_id: string | null
          id: string
          is_archived: boolean | null
          is_favorite: boolean | null
          is_protected: boolean | null
          is_wiki: boolean | null
          parent_document_id: string | null
          position: number | null
          public_link_id: string | null
          title: string
          updated_at: string
          visibility: string | null
          workspace_id: string | null
        }
        Insert: {
          content?: Json
          cover_url?: string | null
          created_at?: string
          created_by_user_id: string
          emoji?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_favorite?: boolean | null
          is_protected?: boolean | null
          is_wiki?: boolean | null
          parent_document_id?: string | null
          position?: number | null
          public_link_id?: string | null
          title: string
          updated_at?: string
          visibility?: string | null
          workspace_id?: string | null
        }
        Update: {
          content?: Json
          cover_url?: string | null
          created_at?: string
          created_by_user_id?: string
          emoji?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_favorite?: boolean | null
          is_protected?: boolean | null
          is_wiki?: boolean | null
          parent_document_id?: string | null
          position?: number | null
          public_link_id?: string | null
          title?: string
          updated_at?: string
          visibility?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          attachments: Json
          author_id: string
          content: string
          content_format: string
          created_at: string
          edited_at: string | null
          id: string
          is_pinned: boolean
          linked_folder_id: string | null
          linked_list_id: string | null
          linked_space_id: string | null
          linked_task_id: string | null
          pinned_at: string | null
          tags: string[]
          title: string | null
          visibility: string
          workspace_id: string
        }
        Insert: {
          attachments?: Json
          author_id: string
          content: string
          content_format?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          linked_folder_id?: string | null
          linked_list_id?: string | null
          linked_space_id?: string | null
          linked_task_id?: string | null
          pinned_at?: string | null
          tags?: string[]
          title?: string | null
          visibility?: string
          workspace_id: string
        }
        Update: {
          attachments?: Json
          author_id?: string
          content?: string
          content_format?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          linked_folder_id?: string | null
          linked_list_id?: string | null
          linked_space_id?: string | null
          linked_task_id?: string | null
          pinned_at?: string | null
          tags?: string[]
          title?: string | null
          visibility?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_linked_folder_id_fkey"
            columns: ["linked_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_linked_list_id_fkey"
            columns: ["linked_list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_linked_space_id_fkey"
            columns: ["linked_space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_followers: {
        Row: {
          created_at: string | null
          folder_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          folder_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          folder_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_followers_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_permissions: {
        Row: {
          created_at: string
          folder_id: string
          id: string
          role: Database["public"]["Enums"]["permission_role"]
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          folder_id: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          folder_id?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folder_permissions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          space_id: string
          status_source: string | null
          status_template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          space_id: string
          status_source?: string | null
          status_template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          space_id?: string
          status_source?: string | null
          status_template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_status_template_id_fkey"
            columns: ["status_template_id"]
            isOneToOne: false
            referencedRelation: "status_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_inbox_processed: {
        Row: {
          assunto: string
          criado_em: string
          id: string
          mensagem_id: string
          resposta: Json | null
        }
        Insert: {
          assunto: string
          criado_em?: string
          id?: string
          mensagem_id: string
          resposta?: Json | null
        }
        Update: {
          assunto?: string
          criado_em?: string
          id?: string
          mensagem_id?: string
          resposta?: Json | null
        }
        Relationships: []
      }
      list_followers: {
        Row: {
          created_at: string | null
          id: string
          list_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          list_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_followers_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      list_permissions: {
        Row: {
          created_at: string
          id: string
          list_id: string
          role: Database["public"]["Enums"]["permission_role"]
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "list_permissions_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          default_view: Database["public"]["Enums"]["list_view"]
          description: string | null
          folder_id: string | null
          id: string
          name: string
          space_id: string
          status_source: string | null
          status_template_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          default_view?: Database["public"]["Enums"]["list_view"]
          description?: string | null
          folder_id?: string | null
          id?: string
          name: string
          space_id: string
          status_source?: string | null
          status_template_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          default_view?: Database["public"]["Enums"]["list_view"]
          description?: string | null
          folder_id?: string | null
          id?: string
          name?: string
          space_id?: string
          status_source?: string | null
          status_template_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lists_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lists_status_template_id_fkey"
            columns: ["status_template_id"]
            isOneToOne: false
            referencedRelation: "status_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      management_members: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      meeting_attendance_conferences: {
        Row: {
          collected_at: string
          created_at: string
          end_time: string | null
          event_id: string | null
          google_conference_record: string
          id: string
          meet_code: string | null
          organizer_user_id: string | null
          start_time: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          collected_at?: string
          created_at?: string
          end_time?: string | null
          event_id?: string | null
          google_conference_record: string
          id?: string
          meet_code?: string | null
          organizer_user_id?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          collected_at?: string
          created_at?: string
          end_time?: string | null
          event_id?: string | null
          google_conference_record?: string
          id?: string
          meet_code?: string | null
          organizer_user_id?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_conferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendance_sessions: {
        Row: {
          conference_id: string
          created_at: string
          display_name: string | null
          duration_seconds: number | null
          email: string | null
          google_session_id: string
          id: string
          join_time: string | null
          leave_time: string | null
          participant_key: string
          participant_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          conference_id: string
          created_at?: string
          display_name?: string | null
          duration_seconds?: number | null
          email?: string | null
          google_session_id: string
          id?: string
          join_time?: string | null
          leave_time?: string | null
          participant_key: string
          participant_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          conference_id?: string
          created_at?: string
          display_name?: string | null
          duration_seconds?: number | null
          email?: string | null
          google_session_id?: string
          id?: string
          join_time?: string | null
          leave_time?: string | null
          participant_key?: string
          participant_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_sessions_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "meeting_attendance_conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          comment_assigned: boolean
          created_at: string
          feed_new_post: boolean
          id: string
          space_permission_change: boolean
          task_assigned: boolean
          task_due_tomorrow: boolean
          task_overdue: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          comment_assigned?: boolean
          created_at?: string
          feed_new_post?: boolean
          id?: string
          space_permission_change?: boolean
          task_assigned?: boolean
          task_due_tomorrow?: boolean
          task_overdue?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          comment_assigned?: boolean
          created_at?: string
          feed_new_post?: boolean
          id?: string
          space_permission_change?: boolean
          task_assigned?: boolean
          task_due_tomorrow?: boolean
          task_overdue?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      productivity_settings: {
        Row: {
          created_at: string
          early_threshold_percent: number
          id: string
          on_time_threshold_percent: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          early_threshold_percent?: number
          id?: string
          on_time_threshold_percent?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          early_threshold_percent?: number
          id?: string
          on_time_threshold_percent?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "productivity_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      productivity_validators: {
        Row: {
          created_at: string
          id: string
          space_id: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          space_id?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          space_id?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "productivity_validators_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productivity_validators_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_origem: string | null
          avatar_path: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          default_workspace_id: string | null
          email: string | null
          full_name: string | null
          hub_user_id: string | null
          id: string
          must_change_password: boolean | null
          phone: string | null
          role_slug: string | null
          updated_at: string
        }
        Insert: {
          avatar_origem?: string | null
          avatar_path?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_workspace_id?: string | null
          email?: string | null
          full_name?: string | null
          hub_user_id?: string | null
          id: string
          must_change_password?: boolean | null
          phone?: string | null
          role_slug?: string | null
          updated_at?: string
        }
        Update: {
          avatar_origem?: string | null
          avatar_path?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_workspace_id?: string | null
          email?: string | null
          full_name?: string | null
          hub_user_id?: string | null
          id?: string
          must_change_password?: boolean | null
          phone?: string | null
          role_slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_workspace_id_fkey"
            columns: ["default_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      relay_diagnostico_log: {
        Row: {
          assunto: string | null
          criado_em: string
          destino: string | null
          direcao: string
          id: string
          mensagem_id: string | null
          modo: string | null
          observacao: string | null
          origem: string | null
          payload: Json | null
          status_code: number | null
        }
        Insert: {
          assunto?: string | null
          criado_em?: string
          destino?: string | null
          direcao: string
          id?: string
          mensagem_id?: string | null
          modo?: string | null
          observacao?: string | null
          origem?: string | null
          payload?: Json | null
          status_code?: number | null
        }
        Update: {
          assunto?: string | null
          criado_em?: string
          destino?: string | null
          direcao?: string
          id?: string
          mensagem_id?: string | null
          modo?: string | null
          observacao?: string | null
          origem?: string | null
          payload?: Json | null
          status_code?: number | null
        }
        Relationships: []
      }
      session_context: {
        Row: {
          baseline_fingerprint: string | null
          baseline_ip: string | null
          created_at: string
          email: string
          login_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          baseline_fingerprint?: string | null
          baseline_ip?: string | null
          created_at?: string
          email: string
          login_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          baseline_fingerprint?: string | null
          baseline_ip?: string | null
          created_at?: string
          email?: string
          login_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      space_followers: {
        Row: {
          created_at: string | null
          id: string
          space_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          space_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_followers_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_permissions: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["permission_role"]
          space_id: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          space_id: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          space_id?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "space_permissions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_template_automations: {
        Row: {
          action_config: Json
          action_type: Database["public"]["Enums"]["automation_action"]
          created_at: string
          description: string | null
          enabled: boolean
          folder_ref_id: string | null
          id: string
          list_ref_id: string | null
          scope_type: string
          template_id: string
          trigger: Database["public"]["Enums"]["automation_trigger"]
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: Database["public"]["Enums"]["automation_action"]
          created_at?: string
          description?: string | null
          enabled?: boolean
          folder_ref_id?: string | null
          id?: string
          list_ref_id?: string | null
          scope_type: string
          template_id: string
          trigger?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: Database["public"]["Enums"]["automation_action"]
          created_at?: string
          description?: string | null
          enabled?: boolean
          folder_ref_id?: string | null
          id?: string
          list_ref_id?: string | null
          scope_type?: string
          template_id?: string
          trigger?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_template_automations_folder_ref_id_fkey"
            columns: ["folder_ref_id"]
            isOneToOne: false
            referencedRelation: "space_template_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_template_automations_list_ref_id_fkey"
            columns: ["list_ref_id"]
            isOneToOne: false
            referencedRelation: "space_template_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_template_automations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "space_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      space_template_folders: {
        Row: {
          description: string | null
          id: string
          name: string
          order_index: number | null
          template_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          order_index?: number | null
          template_id: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          order_index?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_template_folders_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "space_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      space_template_lists: {
        Row: {
          default_view: string | null
          description: string | null
          folder_ref_id: string | null
          id: string
          name: string
          order_index: number | null
          status_template_id: string | null
          template_id: string
        }
        Insert: {
          default_view?: string | null
          description?: string | null
          folder_ref_id?: string | null
          id?: string
          name: string
          order_index?: number | null
          status_template_id?: string | null
          template_id: string
        }
        Update: {
          default_view?: string | null
          description?: string | null
          folder_ref_id?: string | null
          id?: string
          name?: string
          order_index?: number | null
          status_template_id?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_template_lists_folder_ref_id_fkey"
            columns: ["folder_ref_id"]
            isOneToOne: false
            referencedRelation: "space_template_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_template_lists_status_template_id_fkey"
            columns: ["status_template_id"]
            isOneToOne: false
            referencedRelation: "status_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_template_lists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "space_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      space_template_tasks: {
        Row: {
          description: string | null
          due_date_offset: number | null
          due_date_recurrence: Json | null
          estimated_time: number | null
          id: string
          is_milestone: boolean | null
          list_ref_id: string
          order_index: number | null
          priority: string | null
          start_date_offset: number | null
          start_date_recurrence: Json | null
          status_template_item_id: string | null
          tag_names: string[] | null
          template_id: string
          title: string
        }
        Insert: {
          description?: string | null
          due_date_offset?: number | null
          due_date_recurrence?: Json | null
          estimated_time?: number | null
          id?: string
          is_milestone?: boolean | null
          list_ref_id: string
          order_index?: number | null
          priority?: string | null
          start_date_offset?: number | null
          start_date_recurrence?: Json | null
          status_template_item_id?: string | null
          tag_names?: string[] | null
          template_id: string
          title: string
        }
        Update: {
          description?: string | null
          due_date_offset?: number | null
          due_date_recurrence?: Json | null
          estimated_time?: number | null
          id?: string
          is_milestone?: boolean | null
          list_ref_id?: string
          order_index?: number | null
          priority?: string | null
          start_date_offset?: number | null
          start_date_recurrence?: Json | null
          status_template_item_id?: string | null
          tag_names?: string[] | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_template_tasks_list_ref_id_fkey"
            columns: ["list_ref_id"]
            isOneToOne: false
            referencedRelation: "space_template_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_template_tasks_status_template_item_id_fkey"
            columns: ["status_template_item_id"]
            isOneToOne: false
            referencedRelation: "status_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "space_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      space_templates: {
        Row: {
          color: string | null
          created_at: string | null
          created_by_user_id: string
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by_user_id: string
          description?: string | null
          id?: string
          name: string
          type?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by_user_id?: string
          description?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "space_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          account_user_id: string | null
          archived_at: string | null
          client_name: string | null
          color: string | null
          created_at: string
          description: string | null
          head_account_user_id: string | null
          head_projetos_user_id: string | null
          id: string
          name: string
          status_source: string | null
          status_template_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_user_id?: string | null
          archived_at?: string | null
          client_name?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          head_account_user_id?: string | null
          head_projetos_user_id?: string | null
          id?: string
          name: string
          status_source?: string | null
          status_template_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_user_id?: string | null
          archived_at?: string | null
          client_name?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          head_account_user_id?: string | null
          head_projetos_user_id?: string | null
          id?: string
          name?: string
          status_source?: string | null
          status_template_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_account_user_id_fkey"
            columns: ["account_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_head_account_user_id_fkey"
            columns: ["head_account_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_head_projetos_user_id_fkey"
            columns: ["head_projetos_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_status_template_id_fkey"
            columns: ["status_template_id"]
            isOneToOne: false
            referencedRelation: "status_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_clients: {
        Row: {
          app_slug: string
          client_secret_hash: string
          created_at: string
          id: string
          redirect_uri: string
          status: string
        }
        Insert: {
          app_slug: string
          client_secret_hash: string
          created_at?: string
          id?: string
          redirect_uri: string
          status?: string
        }
        Update: {
          app_slug?: string
          client_secret_hash?: string
          created_at?: string
          id?: string
          redirect_uri?: string
          status?: string
        }
        Relationships: []
      }
      status_template_items: {
        Row: {
          category: string | null
          color: string | null
          id: string
          is_default: boolean | null
          name: string
          order_index: number | null
          template_id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          order_index?: number | null
          template_id: string
        }
        Update: {
          category?: string | null
          color?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          order_index?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "status_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      status_templates: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          description: string | null
          id: string
          name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      statuses: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          id: string
          inherit_from_parent: boolean | null
          is_default: boolean
          name: string
          order_index: number
          scope_id: string | null
          scope_type: Database["public"]["Enums"]["status_scope"]
          template_id: string | null
          template_item_id: string | null
          workspace_id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          id?: string
          inherit_from_parent?: boolean | null
          is_default?: boolean
          name: string
          order_index?: number
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["status_scope"]
          template_id?: string | null
          template_item_id?: string | null
          workspace_id: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          id?: string
          inherit_from_parent?: boolean | null
          is_default?: boolean
          name?: string
          order_index?: number
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["status_scope"]
          template_id?: string | null
          template_item_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statuses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "status_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statuses_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "status_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statuses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sticker_packs: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sticker_packs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sticker_usage: {
        Row: {
          id: string
          sticker_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          sticker_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          sticker_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sticker_usage_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      stickers: {
        Row: {
          created_at: string
          created_by: string
          id: string
          image_url: string
          name: string | null
          pack_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          image_url: string
          name?: string | null
          pack_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string
          name?: string | null
          pack_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stickers_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "sticker_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stickers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activities: {
        Row: {
          activity_type: string
          created_at: string
          field_name: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignee_history: {
        Row: {
          assigned_at: string
          classification: string | null
          created_at: string
          due_date: string | null
          id: string
          start_date: string | null
          task_id: string
          unassigned_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          classification?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          start_date?: string | null
          task_id: string
          unassigned_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          classification?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          start_date?: string | null
          task_id?: string
          unassigned_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignee_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          created_at: string
          id: string
          source_id: string | null
          source_type: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist_items: {
        Row: {
          assignee_id: string | null
          checklist_id: string
          content: string
          created_at: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          order_index: number | null
        }
        Insert: {
          assignee_id?: string | null
          checklist_id: string
          content: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          order_index?: number | null
        }
        Update: {
          assignee_id?: string | null
          checklist_id?: string
          content?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "task_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklists: {
        Row: {
          created_at: string | null
          id: string
          order_index: number | null
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_index?: number | null
          task_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_index?: number | null
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklists_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          assignee_id: string | null
          author_id: string
          content: string
          created_at: string | null
          id: string
          resolved_at: string | null
          resolved_by: string | null
          task_id: string
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          task_id: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_followers: {
        Row: {
          created_at: string | null
          id: string
          source_id: string | null
          source_type: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          source_id?: string | null
          source_type?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          source_id?: string | null
          source_type?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_followers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_permissions: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["permission_role"]
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_permissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_productivity_validations: {
        Row: {
          created_at: string
          event_type: string
          id: string
          notes: string | null
          original_classification: string
          task_id: string
          user_id: string
          validated_at: string
          validated_by: string
          validated_classification: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          notes?: string | null
          original_classification: string
          task_id: string
          user_id: string
          validated_at?: string
          validated_by: string
          validated_classification: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          original_classification?: string
          task_id?: string
          user_id?: string
          validated_at?: string
          validated_by?: string
          validated_classification?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_productivity_validations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tag_relations: {
        Row: {
          created_at: string | null
          id: string
          tag_id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag_id: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "task_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tag_relations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          assignee_id: string | null
          cliente_devolucoes_count: number
          completed_at: string | null
          cover_image_url: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          due_date: string | null
          estimated_time: number | null
          external_post_ref: string | null
          format: string | null
          id: string
          is_milestone: boolean | null
          list_id: string
          parent_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          recurrence_config: Json | null
          social_channel: string | null
          start_date: string | null
          status_id: string
          time_spent: number | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          assignee_id?: string | null
          cliente_devolucoes_count?: number
          completed_at?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          due_date?: string | null
          estimated_time?: number | null
          external_post_ref?: string | null
          format?: string | null
          id?: string
          is_milestone?: boolean | null
          list_id: string
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_config?: Json | null
          social_channel?: string | null
          start_date?: string | null
          status_id: string
          time_spent?: number | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          assignee_id?: string | null
          cliente_devolucoes_count?: number
          completed_at?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          due_date?: string | null
          estimated_time?: number | null
          external_post_ref?: string | null
          format?: string | null
          id?: string
          is_milestone?: boolean | null
          list_id?: string
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_config?: Json | null
          social_channel?: string | null
          start_date?: string | null
          status_id?: string
          time_spent?: number | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_sessions: {
        Row: {
          created_at: string
          day: string
          ended_at: string | null
          id: string
          last_seen_at: string
          started_at: string
          state: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          ended_at?: string | null
          id?: string
          last_seen_at?: string
          started_at?: string
          state?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          ended_at?: string | null
          id?: string
          last_seen_at?: string
          started_at?: string
          state?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_column_preferences: {
        Row: {
          column_order: string[] | null
          created_at: string | null
          id: string
          list_id: string | null
          scope: string
          updated_at: string | null
          user_id: string
          visible_columns: string[] | null
        }
        Insert: {
          column_order?: string[] | null
          created_at?: string | null
          id?: string
          list_id?: string | null
          scope?: string
          updated_at?: string | null
          user_id: string
          visible_columns?: string[] | null
        }
        Update: {
          column_order?: string[] | null
          created_at?: string | null
          id?: string
          list_id?: string | null
          scope?: string
          updated_at?: string | null
          user_id?: string
          visible_columns?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "user_column_preferences_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_user_id: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by_user_id: string
          role: Database["public"]["Enums"]["workspace_role"]
          status?: string
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_space: { Args: { p_space_id: string }; Returns: undefined }
      calc_delivery_pct: {
        Args: { p_due_date: string; p_reference: string; p_start_date: string }
        Returns: number
      }
      calc_productivity_score: {
        Args: { p_delivery_pct: number }
        Returns: number
      }
      can_access_management: { Args: { _user_id: string }; Returns: boolean }
      can_create_workspace: { Args: { _user_id: string }; Returns: boolean }
      can_edit_user: {
        Args: { _editor_id: string; _target_user_id: string }
        Returns: boolean
      }
      can_manage_space_template: {
        Args: { _template_id: string; _user_id: string }
        Returns: boolean
      }
      count_tasks_for_template_items: {
        Args: { p_item_ids: string[] }
        Returns: {
          task_count: number
          template_item_id: string
        }[]
      }
      create_space_secure: {
        Args: {
          p_color?: string
          p_description?: string
          p_name: string
          p_workspace_id: string
        }
        Returns: string
      }
      delete_user_completely: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      expire_old_invitations: { Args: never; Returns: undefined }
      get_account_productivity_report: {
        Args: {
          p_account_user_id?: string
          p_early_threshold?: number
          p_end_date?: string
          p_on_time_threshold?: number
          p_start_date?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_all_users_for_global_owner: {
        Args: never
        Returns: {
          created_at: string
          email: string
          user_id: string
        }[]
      }
      get_all_users_for_system_admin: {
        Args: never
        Returns: {
          created_at: string
          email: string
          user_id: string
        }[]
      }
      get_all_users_with_emails: {
        Args: never
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_flow_usage_details: {
        Args: { _from: string; _to: string; _user_id: string }
        Returns: Json
      }
      get_flow_usage_report: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      get_head_account_productivity_report: {
        Args: {
          p_early_threshold?: number
          p_end_date?: string
          p_head_user_id?: string
          p_on_time_threshold?: number
          p_start_date?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_head_projetos_productivity_report: {
        Args: {
          p_early_threshold?: number
          p_end_date?: string
          p_head_user_id?: string
          p_on_time_threshold?: number
          p_start_date?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_productivity_details_by_scope:
        | {
            Args: {
              p_early_threshold?: number
              p_end_date?: string
              p_include_transferred?: boolean
              p_limit?: number
              p_on_time_threshold?: number
              p_scope?: string
              p_space_id?: string
              p_start_date?: string
              p_user_id?: string
              p_user_ids?: string[]
              p_workspace_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_early_threshold?: number
              p_end_date?: string
              p_folder_id?: string
              p_include_transferred?: boolean
              p_limit?: number
              p_list_id?: string
              p_on_time_threshold?: number
              p_scope?: string
              p_space_id?: string
              p_start_date?: string
              p_user_id?: string
              p_user_ids?: string[]
              p_workspace_id: string
            }
            Returns: Json
          }
      get_productivity_ranking: {
        Args: {
          p_early_threshold?: number
          p_end_date?: string
          p_include_transferred?: boolean
          p_on_time_threshold?: number
          p_start_date?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_productivity_stats: {
        Args: {
          p_early_threshold?: number
          p_end_date?: string
          p_folder_id?: string
          p_include_transferred?: boolean
          p_list_id?: string
          p_on_time_threshold?: number
          p_scope?: string
          p_space_id?: string
          p_start_date?: string
          p_user_id?: string
          p_user_ids?: string[]
          p_workspace_id: string
        }
        Returns: Json
      }
      get_user_id_by_email: { Args: { email: string }; Returns: string }
      get_user_productivity_details: {
        Args: {
          p_early_threshold?: number
          p_end_date?: string
          p_include_transferred?: boolean
          p_limit?: number
          p_on_time_threshold?: number
          p_start_date?: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_user_workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
      get_workspace_members_with_emails: {
        Args: { workspace_uuid: string }
        Returns: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_app_admin: { Args: { _user_id: string }; Returns: boolean }
      is_document_creator: {
        Args: { _document_id: string; _user_id: string }
        Returns: boolean
      }
      is_global_owner: { Args: { _user_id: string }; Returns: boolean }
      is_hub_global_admin: { Args: { _user_id: string }; Returns: boolean }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_system_admin: { Args: { _user_id: string }; Returns: boolean }
      is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      norm_status_name: { Args: { _name: string }; Returns: string }
      normalize_client_key: { Args: { _valor: string }; Returns: string }
      restore_space: { Args: { p_space_id: string }; Returns: undefined }
      resync_template_statuses: {
        Args: {
          p_reassign?: Json
          p_removed_item_ids?: string[]
          p_template_id: string
        }
        Returns: undefined
      }
      sync_hub_role_to_app_roles: {
        Args: { _role_slug: string; _user_id: string }
        Returns: undefined
      }
      sync_template_statuses_for_list: {
        Args: {
          p_list_id: string
          p_template_id: string
          p_workspace_id: string
        }
        Returns: undefined
      }
      update_user_avatar_as_admin: {
        Args: { new_avatar_url: string; target_user_id: string }
        Returns: boolean
      }
      update_user_profile_as_admin: {
        Args: {
          new_bio?: string
          new_full_name?: string
          new_phone?: string
          target_user_id: string
        }
        Returns: boolean
      }
      user_can_access_calendar_event: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_document: {
        Args: { _document_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_folder: {
        Args: { _folder_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_list: {
        Args: { _list_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_list_via_space: {
        Args: { _list_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_space: {
        Args: { _space_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_task: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_create_in_space: {
        Args: { _space_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_space_permission: {
        Args: { _space_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      user_is_calendar_event_guest: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_channel_member: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      user_is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      user_owns_calendar_event: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "global_owner" | "admin" | "user" | "owner"
      automation_action:
        | "auto_assign_user"
        | "auto_assign_team"
        | "notify_channel"
        | "set_status"
        | "auto_add_follower"
        | "set_priority"
        | "add_assignee"
        | "remove_assignee"
        | "add_follower"
        | "add_tag"
        | "remove_tag"
        | "set_due_date"
        | "set_start_date"
        | "send_notification"
        | "create_subtask"
        | "move_task"
        | "archive_task"
        | "send_webhook"
        | "remove_all_assignees"
      automation_scope: "workspace" | "space" | "folder" | "list"
      automation_trigger:
        | "on_task_created"
        | "on_task_updated"
        | "on_status_changed"
        | "on_custom_field_changed"
        | "on_schedule"
        | "on_comment_added"
        | "on_all_checklists_resolved"
        | "on_all_subtasks_resolved"
        | "on_task_added_here"
        | "on_task_moved_here"
        | "on_due_date_changed"
        | "on_start_date_changed"
        | "on_date_before_after"
        | "on_start_date_arrives"
        | "on_due_date_arrives"
        | "on_custom_date_arrives"
        | "on_time_tracked"
        | "on_assignee_added"
        | "on_assignee_removed"
        | "on_name_changed"
        | "on_priority_changed"
        | "on_tag_added"
        | "on_tag_removed"
        | "on_task_type_changed"
        | "on_task_linked"
        | "on_task_unblocked"
      chat_channel_role: "owner" | "member"
      chat_channel_type:
        | "client"
        | "department"
        | "project"
        | "custom"
        | "space"
        | "dm"
        | "group_dm"
      list_view: "list" | "kanban" | "sprint"
      permission_role: "viewer" | "commenter" | "editor"
      status_scope: "workspace" | "space" | "folder" | "list"
      task_priority: "low" | "medium" | "high" | "urgent"
      team_role: "leader" | "member"
      workspace_role: "admin" | "member" | "limited_member" | "guest"
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
      app_role: ["global_owner", "admin", "user", "owner"],
      automation_action: [
        "auto_assign_user",
        "auto_assign_team",
        "notify_channel",
        "set_status",
        "auto_add_follower",
        "set_priority",
        "add_assignee",
        "remove_assignee",
        "add_follower",
        "add_tag",
        "remove_tag",
        "set_due_date",
        "set_start_date",
        "send_notification",
        "create_subtask",
        "move_task",
        "archive_task",
        "send_webhook",
        "remove_all_assignees",
      ],
      automation_scope: ["workspace", "space", "folder", "list"],
      automation_trigger: [
        "on_task_created",
        "on_task_updated",
        "on_status_changed",
        "on_custom_field_changed",
        "on_schedule",
        "on_comment_added",
        "on_all_checklists_resolved",
        "on_all_subtasks_resolved",
        "on_task_added_here",
        "on_task_moved_here",
        "on_due_date_changed",
        "on_start_date_changed",
        "on_date_before_after",
        "on_start_date_arrives",
        "on_due_date_arrives",
        "on_custom_date_arrives",
        "on_time_tracked",
        "on_assignee_added",
        "on_assignee_removed",
        "on_name_changed",
        "on_priority_changed",
        "on_tag_added",
        "on_tag_removed",
        "on_task_type_changed",
        "on_task_linked",
        "on_task_unblocked",
      ],
      chat_channel_role: ["owner", "member"],
      chat_channel_type: [
        "client",
        "department",
        "project",
        "custom",
        "space",
        "dm",
        "group_dm",
      ],
      list_view: ["list", "kanban", "sprint"],
      permission_role: ["viewer", "commenter", "editor"],
      status_scope: ["workspace", "space", "folder", "list"],
      task_priority: ["low", "medium", "high", "urgent"],
      team_role: ["leader", "member"],
      workspace_role: ["admin", "member", "limited_member", "guest"],
    },
  },
} as const
