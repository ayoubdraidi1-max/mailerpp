import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").filter(Boolean);
    // path = ["user-management", ...actionSegments]

    const action = path[1] ?? "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Seed default admin user (public, runs once)
    if (action === "seed-admin") {
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const adminExists = existingUsers?.users?.some(
        (u: { email?: string }) => u.email === "admin@admin.com"
      );

      if (adminExists) {
        return new Response(
          JSON.stringify({ message: "Admin user already exists" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await admin.auth.admin.createUser({
        email: "admin@admin.com",
        password: "Adm1n!2024#secure",
        email_confirm: true,
        user_metadata: { role: "admin" },
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await admin.from("profiles").upsert({
        id: data.user.id,
        role: "admin",
        mailer_id: null,
      });

      return new Response(
        JSON.stringify({ message: "Admin user created", id: data.user.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All other actions require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Access denied: admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));

    // List all users
    if (action === "list-users") {
      const { data: profiles, error: profErr } = await admin
        .from("profiles")
        .select("id, role, mailer_id, created_at, avatar_url, gender, is_online, last_seen, mailers(name)")
        .order("created_at", { ascending: false });

      if (profErr) {
        return new Response(
          JSON.stringify({ error: profErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: authUsers } = await admin.auth.admin.listUsers();

      const users = (profiles ?? []).map((p: Record<string, unknown>) => {
        const authUser = authUsers?.users?.find(
          (u: { id: string }) => u.id === p.id
        );
        return {
          id: p.id,
          email: authUser?.email ?? "",
          role: p.role,
          mailer_id: p.mailer_id,
          mailer_name: (p.mailers as { name: string } | null)?.name ?? null,
          created_at: p.created_at,
          avatar_url: p.avatar_url ?? null,
          gender: p.gender ?? null,
          is_online: p.is_online ?? false,
          last_seen: p.last_seen ?? null,
        };
      });

      return new Response(
        JSON.stringify(users),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user
    if (action === "create-user") {
      const { email, password, role, mailer_id, gender, avatar_url } = body as {
        email: string;
        password: string;
        role: string;
        mailer_id?: string;
        gender?: string;
        avatar_url?: string;
      };

      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Email and password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!gender || !['male', 'female'].includes(gender)) {
        return new Response(
          JSON.stringify({ error: "Gender is required (male or female)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: role ?? "user" },
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await admin.from("profiles").upsert({
        id: data.user.id,
        role: role ?? "user",
        mailer_id: mailer_id ?? null,
        gender,
        avatar_url: avatar_url ?? null,
      });

      return new Response(
        JSON.stringify({ message: "User created", id: data.user.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Heartbeat — sets current user as online and updates last_seen
    if (action === "heartbeat") {
      const now = new Date();
      await admin.from("profiles")
        .update({ is_online: true, last_seen: now.toISOString() })
        .eq("id", userData.user.id);

      return new Response(
        JSON.stringify({ message: "ok" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Go offline
    if (action === "go-offline") {
      await admin.from("profiles")
        .update({ is_online: false })
        .eq("id", userData.user.id);

      return new Response(
        JSON.stringify({ message: "ok" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Change password
    if (action === "change-password") {
      const { user_id, new_password } = body as {
        user_id: string;
        new_password: string;
      };

      if (!user_id || !new_password) {
        return new Response(
          JSON.stringify({ error: "User ID and new password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await admin.auth.admin.updateUserById(user_id, {
        password: new_password,
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ message: "Password updated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update role
    if (action === "update-role") {
      const { user_id, new_role } = body as {
        user_id: string;
        new_role: string;
      };

      if (!user_id || !new_role) {
        return new Response(
          JSON.stringify({ error: "User ID and role are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await admin.from("profiles")
        .update({ role: new_role })
        .eq("id", user_id);

      await admin.auth.admin.updateUserById(user_id, {
        user_metadata: { role: new_role },
      });

      return new Response(
        JSON.stringify({ message: "Role updated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update mailer link
    if (action === "update-mailer") {
      const { user_id, mailer_id } = body as {
        user_id: string;
        mailer_id: string | null;
      };

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await admin.from("profiles")
        .update({ mailer_id: mailer_id ?? null })
        .eq("id", user_id);

      return new Response(
        JSON.stringify({ message: "Mailer link updated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete user
    if (action === "delete-user") {
      const { user_id } = body as { user_id: string };

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await admin.auth.admin.deleteUser(user_id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ message: "User deleted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
