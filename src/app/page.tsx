import { auth, signIn, signOut } from "@/auth";
import { getUserProjects, getUserInvites, createProject, createInvite, updateInviteStatus, deleteProject } from "@/lib/db";
import { redirect } from "next/navigation";
import styles from "./Dashboard.module.css";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  console.log("DashboardPage Session:", JSON.stringify(session, null, 2));

  if (!session?.user?.email) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h1 className={styles.title}>Welcome to Fincord</h1>
          <p className={styles.subtitle}>Sign in to start collaborating.</p>

          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button type="submit" className={styles.submitBtn}>
              Sign in with Google
            </button>
          </form>
        </div>
      </div>
    );
  }

  const projects = getUserProjects(session.user.id!);
  const invites = getUserInvites(session.user.email);
  console.log(`User ${session.user.email} has ${projects.length} projects and ${invites.length} invites.`);

  async function handleCreateProject(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    if (name && session?.user?.id) {
      const project = await createProject(name, session.user.id);
      redirect(`/project/${project.id}`);
    }
  }

  async function handleSignOut() {
    "use server";
    await signOut();
  }

  async function handleDeleteProject(projectId: string) {
    "use server";
    if (session?.user?.id) {
      // Verify ownership before deleting
      // Note: We need to re-fetch or trust the ID. 
      // Since we are server-side, we can check DB directly or use the passed projects list if it was fresh.
      // But `projects` const is from this render.
      const project = projects.find(p => p.id === projectId);
      if (project && project.ownerId === session.user.id) {
        deleteProject(projectId);
        redirect("/"); // Refresh page
      }
    }
  }

  return (
    <DashboardClient
      user={session.user}
      projects={projects}
      invites={invites}
      createProjectAction={handleCreateProject}
      signOutAction={handleSignOut}
      deleteProjectAction={handleDeleteProject}
    />
  );
}
