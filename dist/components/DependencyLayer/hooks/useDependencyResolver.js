import { useEffect, useRef, useState } from "react";
import { useDependencyResolverContext } from "../DependencyLayer.js";
export const useDependencyResolver = ({ callback, cleanup }) => {
    const [dependencyResolved, setDependencyResolved] = useDependencyResolverContext();
    const [cleaningUp, setCleaningUp] = useState(false);
    const cleaningUpRef = useRef(cleaningUp);
    cleaningUpRef.current = cleaningUp;
    useEffect(() => {
        if (!dependencyResolved && !cleaningUp && !cleaningUpRef.current) {
            callback(setDependencyResolved);
        }
        return () => {
            if (!dependencyResolved || cleaningUp)
                return; // Don't run when flipped from false to true
            setCleaningUp(true);
            cleaningUpRef.current = true;
            cleanup?.(setCleaningUp);
        };
    }, [dependencyResolved, cleaningUp]);
};
