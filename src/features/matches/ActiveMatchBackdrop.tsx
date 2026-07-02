export const ActiveMatchBackdrop = ({
  heroPhoto,
  pageBgTheme
}: {
  heroPhoto: string;
  pageBgTheme: {
    base: string;
    photoBlend: string;
  };
}) => {
  void heroPhoto;
  void pageBgTheme;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#FBFBFD]" />
  );
};
