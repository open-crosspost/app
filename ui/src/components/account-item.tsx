import type { ConnectedAccount } from "@crosspost/plugin/types";
import type React from "react";
import { ProfileCard } from "./profile-card";
import { Button } from "./ui/button";

export interface AccountItemProps {
  account: ConnectedAccount;
  isSelected: boolean;
  onSelect: () => void;
  actions?: React.ReactNode;
  variant?: "default" | "compact";
  disabled?: boolean;
  title?: string;
  hasError?: boolean;
}

export function AccountItem({
  account,
  isSelected,
  onSelect,
  actions,
  variant = "default",
  disabled = false,
  title,
  hasError = false,
}: AccountItemProps) {
  // Handle click with disabled state
  const handleClick = () => {
    if (!disabled) {
      onSelect();
    }
  };

  // Compact variant is used in the grid layout of PlatformAccountsSelector
  if (variant === "compact") {
    return (
      <button
        type="button"
        className={`flex items-center p-3 rounded-md transition-colors w-full text-left ${
          hasError
            ? "border-2 border-destructive/60 bg-destructive/10 opacity-80 cursor-not-allowed"
            : disabled
              ? "border-2 border-border bg-muted opacity-60 cursor-not-allowed"
              : isSelected
                ? "border-2 border-success bg-success/10 cursor-pointer"
                : "border-2 border-border hover:bg-muted cursor-pointer"
        }`}
        onClick={handleClick}
        title={title}
        disabled={disabled || hasError}
      >
        <div className="flex-grow overflow-hidden">
          {hasError ? (
            <div>
              <p className="font-medium text-sm text-destructive truncate">{account.platform}</p>
              <p className="text-xs text-destructive/80 truncate">ID: {account.userId}</p>
              {account.error && (
                <p className="text-xs text-destructive truncate" title={account.error}>
                  {account.error}
                </p>
              )}
            </div>
          ) : !account.profile ? (
            <div className="flex items-center gap-2">
              <div className="flex-grow min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  @{account.userId || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">{account.platform}</p>
              </div>
            </div>
          ) : (
            <ProfileCard account={account} size="sm" />
          )}
        </div>

        <div className="flex-shrink-0 ml-2">
          <div
            className={`w-6 h-6 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center ${
              hasError || disabled
                ? "border-border bg-muted"
                : isSelected
                  ? "border-success bg-success"
                  : "border-border"
            }`}
          >
            {isSelected && !hasError && !disabled && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3 text-white"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-md border-2 p-3 sm:p-4 gap-3 ${
        hasError
          ? "border-destructive/60 bg-destructive/10 opacity-80"
          : disabled
            ? "border-border bg-muted opacity-60"
            : isSelected
              ? "border-success bg-success/10"
              : "border-border"
      }`}
      title={title}
    >
      <div className="flex items-center space-x-4 overflow-hidden">
        {hasError ? (
          <div>
            <p className="font-medium text-destructive truncate">{account.platform}</p>
            <p className="text-sm text-destructive/80 truncate">ID: {account.userId}</p>
            {account.error && (
              <p className="text-xs text-destructive truncate" title={account.error}>
                {account.error}
              </p>
            )}
          </div>
        ) : !account.profile ? (
          <div>
            <p className="font-medium text-foreground truncate">@{account.userId || "Unknown"}</p>
            <p className="text-sm text-muted-foreground">{account.platform}</p>
          </div>
        ) : (
          <ProfileCard account={account} size="md" />
        )}
      </div>

      <div className="flex items-center space-x-2 ml-0 sm:ml-auto">
        {actions}
        <Button
          size="sm"
          onClick={handleClick}
          disabled={disabled || hasError}
          className={
            isSelected && !hasError ? "bg-success text-primary-foreground hover:bg-success/90" : ""
          }
        >
          {isSelected && !hasError ? "Selected" : "Select"}
        </Button>
      </div>
    </div>
  );
}
