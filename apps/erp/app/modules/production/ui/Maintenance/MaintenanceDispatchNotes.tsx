import { useCarbon } from "@carbon/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  generateHTML,
  type JSONContent,
  toast,
  useDebounce
} from "@carbon/react";
import { Editor } from "@carbon/react/Editor";
import { nanoid } from "nanoid";
import { Suspense, useState } from "react";
import { Await } from "react-router";
import { Files, FilesSkeleton } from "~/components";
import { usePermissions, useUser } from "~/hooks";
import type { StorageItem } from "~/types";
import { getPrivateUrl } from "~/utils/path";

export function MaintenanceDispatchNotes({
  id,
  content: initialContent,
  isDisabled
}: {
  id: string;
  content: JSONContent;
  isDisabled: boolean;
}) {
  const {
    id: userId,
    company: { id: companyId }
  } = useUser();
  const { carbon } = useCarbon();
  const permissions = usePermissions();

  const [content, setContent] = useState(initialContent ?? {});

  const onUploadImage = async (file: File) => {
    const fileType = file.name.split(".").pop();
    const fileName = `${companyId}/maintenance/${nanoid()}.${fileType}`;

    const result = await carbon?.storage.from("private").upload(fileName, file);

    if (result?.error) {
      toast.error("Failed to upload image");
      throw new Error(result.error.message);
    }

    if (!result?.data) {
      throw new Error("Failed to upload image");
    }

    return getPrivateUrl(result.data.path);
  };

  const onUpdateContent = useDebounce(
    async (content: JSONContent) => {
      await carbon
        ?.from("maintenanceDispatch")
        .update({
          content: content,
          updatedBy: userId
        })
        .eq("id", id!);
    },
    2500,
    true
  );

  if (!id) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
        <CardDescription>
          Add notes and documentation for this maintenance dispatch
        </CardDescription>
      </CardHeader>

      <CardContent>
        {permissions.can("update", "production") && !isDisabled ? (
          <Editor
            initialValue={(content ?? {}) as JSONContent}
            onUpload={onUploadImage}
            onChange={(value) => {
              setContent(value);
              onUpdateContent(value);
            }}
          />
        ) : (
          <div
            className="prose dark:prose-invert"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: suppressed due to migration
            dangerouslySetInnerHTML={{
              __html: generateHTML(content as JSONContent)
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function MaintenanceDispatchFiles({
  id,
  files
}: {
  id: string;
  files: Promise<StorageItem[]>;
}) {
  const permissions = usePermissions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Files</CardTitle>
        <CardDescription>
          Attachments and documents related to this dispatch
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<FilesSkeleton />}>
          <Await resolve={files}>
            {(resolvedFiles) => (
              <Files
                bucket="private"
                path={id}
                files={resolvedFiles}
                isReadOnly={!permissions.can("update", "production")}
              />
            )}
          </Await>
        </Suspense>
      </CardContent>
    </Card>
  );
}

export default MaintenanceDispatchNotes;
