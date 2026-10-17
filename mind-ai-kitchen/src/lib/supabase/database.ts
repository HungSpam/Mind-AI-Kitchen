export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CommunityPostRow = {
  id: string;
  author_id: string;
  title: string;
  summary: string;
  servings: number;
  minutes: number;
  difficulty: 'Dễ' | 'Vừa' | 'Khó';
  ingredients: Json;
  steps: Json;
  nutrition: Json | null;
  sources: Json;
  tags: string[];
  image_path: string | null;
  schema_version: number;
  recipe_version: number;
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'hidden' | 'withdrawn';
  moderation_reason: string | null;
  source_recipe_id: string | null;
  search_text: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ProfileRow = {
  user_id: string;
  allergies: string;
  goal: string;
  preferences: string;
  likes: string[];
  dislikes: string[];
  diet_tags: string[];
  default_servings: number;
  max_cook_minutes: number | null;
  equipment: string[];
  timezone: string;
  version: number;
  created_at: string;
  updated_at: string;
};

type RecipeRow = {
  id: string; owner_id: string; title: string; recipe: Json; schema_version: number;
  recipe_version: number; source: 'generated' | 'community' | 'manual' | 'imported';
  source_post_id: string | null; is_favorite: boolean; deleted_at: string | null; created_at: string; updated_at: string;
};
type MealLogRow = {
  id: string; owner_id: string; cooking_session_id: string | null; recipe_id: string | null;
  recipe_snapshot: Json; servings: number; meal_type: 'Bữa Sáng' | 'Bữa Trưa' | 'Bữa Tối' | 'Bữa Phụ';
  consumed_at: string; calories: number | null; macros: Json | null; created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Partial<ProfileRow> & Pick<ProfileRow, 'user_id'>>;
      recipes: Table<RecipeRow, Partial<RecipeRow> & Pick<RecipeRow, 'id' | 'owner_id' | 'title' | 'recipe'>>;
      recipe_feedback: Table<{
        user_id: string; recipe_id: string; rating: number | null; notes: string | null;
        reason_tags: string[]; cooked_at: string | null; version: number; created_at: string; updated_at: string;
      }, { user_id: string; recipe_id: string; rating?: number | null; notes?: string | null; reason_tags?: string[] }>;
      meal_logs: Table<MealLogRow, Partial<MealLogRow> & Pick<MealLogRow, 'id' | 'owner_id' | 'recipe_snapshot' | 'servings' | 'meal_type'>>;
      community_saves: Table<{
        user_id: string; post_id: string; post_version: number; saved_recipe_id: string | null;
        saved_snapshot: Json; created_at: string;
      }, { user_id: string; post_id: string; post_version: number; saved_snapshot: Json; saved_recipe_id?: string | null }>;
      content_reports: Table<{
        id: string; reporter_id: string | null; post_id: string; reason: 'ingredient_safety' | 'misleading' | 'spam' | 'rights' | 'other';
        detail: string | null; status: 'open' | 'reviewing' | 'resolved' | 'dismissed'; created_at: string; resolved_at: string | null; resolution: string | null;
      }, { id?: string; reporter_id?: string | null; post_id: string; reason: 'ingredient_safety' | 'misleading' | 'spam' | 'rights' | 'other'; detail?: string | null }>;
      moderation_actions: Table<{
        id: string; moderator_id: string; post_id: string | null; report_id: string | null;
        decision: 'approve' | 'reject' | 'hide' | 'restore' | 'report_resolved' | 'report_dismissed'; reason: string; created_at: string;
      }, { id?: string; moderator_id: string; decision: 'approve' | 'reject' | 'hide' | 'restore' | 'report_resolved' | 'report_dismissed'; reason: string }>;
      community_posts: Table<
        CommunityPostRow,
        Partial<CommunityPostRow> &
          Pick<
            CommunityPostRow,
            'author_id' | 'title' | 'servings' | 'minutes' | 'difficulty' | 'ingredients' | 'steps'
          >
      >;
      public_profiles: Table<
        {
          user_id: string;
          display_name: string;
          bio: string;
          avatar_path: string | null;
          published_at: string;
          updated_at: string;
        },
        { user_id: string; display_name: string; bio?: string; avatar_path?: string | null }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      save_community_post: { Args: { p_post_id: string }; Returns: string };
      request_community_review: { Args: { post_id: string }; Returns: undefined };
      withdraw_community_post: { Args: { post_id: string }; Returns: undefined };
      moderate_community_post: {
        Args: { post_id: string; decision: string; reason: string };
        Returns: undefined;
      };
      submit_content_report: {
        Args: { post_id: string; reason: string; detail?: string | null };
        Returns: string;
      };
      resolve_content_report: { Args: { p_report_id: string; p_decision: string; p_resolution: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
