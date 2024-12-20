export const TunerBar = ({
  pitchDeltaInCents,
}: {
  pitchDeltaInCents: number;
}) => {
  return (
    <div className="flex flex-row items-center bg-red-500 rounded-full m-4 relative self-stretch">
      <div className="flex-1 bg-transparent">&nbsp;</div>
      <div className="flex-1 bg-green-500 rounded-l-full m-0">&nbsp;</div>
      <div className="w-1 bg-white">&nbsp;</div>
      <div className="flex-1 bg-green-500 rounded-r-full m-0">&nbsp;</div>
      <div className="flex-1 bg-transparent">&nbsp;</div>
      <div className="absolute w-full flex flex-row items-center">
        <div
          className="flex-grow"
          style={{ flex: `0 0 ${50 + pitchDeltaInCents}%` }}
        ></div>
        <div className="bg-white rounded-full h-[8px] p-[8px] ml-[-10px] m-0 flex items-center justify-center">
          &nbsp;
        </div>
        <div
          className="flex-grow"
          style={{ flex: `0 0 ${50 - pitchDeltaInCents}%` }}
        ></div>
      </div>
    </div>
  );
};
