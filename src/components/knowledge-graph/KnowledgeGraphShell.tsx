import { useState } from "react";
import FacultyExplorer from "./FacultyExplorer";
import TopicExplorer from "./TopicExplorer";
import type { AppMode } from "./types";

export default function KnowledgeGraphShell() {
  const [mode, setMode] = useState<AppMode>("faculty");
  const [focusFacultyId, setFocusFacultyId] = useState("");

  const openFaculty = (facultyId: string) => {
    setFocusFacultyId(facultyId);
    setMode("faculty");
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      {mode === "faculty" ? (
        <FacultyExplorer mode={mode} setMode={setMode} initialFacultyId={focusFacultyId} />
      ) : (
        <TopicExplorer mode={mode} setMode={setMode} onOpenFaculty={openFaculty} />
      )}
    </div>
  );
}
