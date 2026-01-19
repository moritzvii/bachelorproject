import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLast } from "lucide-react";

type ContinueButtonProps = {
  disabled?: boolean;
  onClick?: () => void;
  disabledMessage?: string;
};

export function ContinueButton({ disabled, onClick, disabledMessage = "Pick a focus to continue" }: ContinueButtonProps) {
  const button = (
    <Button
      size="sm"
      variant="link"
      disabled={disabled}
      className="flex items-center gap-2"
      onClick={onClick}
    >
      <span className="text-sm font-semibold">Continue</span>
      <ChevronLast />
    </Button>
  );

  if (!disabled) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-not-allowed items-center" aria-disabled>
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{disabledMessage}</p>
      </TooltipContent>
    </Tooltip>
  );
}
