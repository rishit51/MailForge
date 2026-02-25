import { Check } from "lucide-react"

export function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {/* Step circle */}
            <div
              className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 
                text-sm font-medium transition-all
                ${isCompleted 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : isCurrent 
                    ? "border-primary text-primary bg-primary/10" 
                    : "border-muted-foreground/30 text-muted-foreground"
                }
              `}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            
            {/* Step label */}
            <span
              className={`
                ml-2 text-sm hidden sm:block
                ${isCurrent ? "font-medium text-foreground" : "text-muted-foreground"}
              `}
            >
              {step}
            </span>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  flex-1 h-0.5 mx-4
                  ${index < currentStep ? "bg-primary" : "bg-muted-foreground/20"}
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

