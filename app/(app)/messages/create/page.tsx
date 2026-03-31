import { AppScreen } from "@/components/app/app-screen";
import { GroupCreate } from "@/components/groups/group-create";
import { BackButton } from "@/components/post/back-button";

export default function CreateMessageGroupPage() {
  return (
    <AppScreen>
      <div className="pinly-content-shell pinly-screen-stack">
        <BackButton fallbackHref="/messages" label="Messages" />
        <GroupCreate />
      </div>
    </AppScreen>
  );
}
