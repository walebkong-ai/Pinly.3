import { GroupCreate } from "@/components/groups/group-create";
import { BackButton } from "@/components/post/back-button";

export default function CreateMessageGroupPage() {
  return (
    <div className="flex min-h-0 flex-col gap-4">
      <BackButton fallbackHref="/messages" label="Messages" />
      <GroupCreate />
    </div>
  );
}
