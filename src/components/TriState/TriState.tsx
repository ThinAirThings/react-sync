import React, { FC, ReactNode, createContext, useContext } from "react";
import { Result, useTriggeredResultEffect } from "../../index.js";



export const TriState = <T extends Parameters<typeof useTriggeredResultEffect>,>({
    triStateConfig,
    ChildComponent
}: {
    triStateConfig: T extends Parameters<typeof useTriggeredResultEffect>? T : never,
    ChildComponent: FC<{
        nodeDependencies: Result<T[0]>,
        parentDependencies: T[1] 
    }>
}) => {
    const [nodeDependencies] = useTriggeredResultEffect(triStateConfig[0], triStateConfig[1], triStateConfig[2])
    return (
        <>
            <ChildComponent
                parentDependencies={triStateConfig[1]}
            />
        </>
    )
}


export const Thing = () => {  
    const [dep] = useTriggeredResultEffect(() => {
        return new Promise<number>((resolve, reject) => {
            setTimeout(() => {
                resolve(5)
            }, 1000)
        })
    }, [])

    return <TriState
        triStateConfig={[() => {
            return new Promise<string>((resolve, reject) => {
                setTimeout(() => {
                    resolve("hello")
                }, 1000)
            })
        }, [dep]]}
        ChildComponent={({nodeDependencies, parentDependencies}) => {
            return <div></div>
        }}
    />
}



const ParentStateMachineContext = createContext<Array<Result<any>>>([])
type DependencyValues<Deps extends Array<Result<any>>> = { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never }
export const StateMachine = <T, Deps extends Array<Result<any>>>({
    key,
    callback,
    parentDependencies,
    lifecycleHandlers,
    UiComponent,
    children
}: {
    key: string,
    callback: (dependencyValues: DependencyValues<Deps>) => Promise<T>,
    parentDependencies: Deps,
    lifecycleHandlers?: {
        pending?: (dependencyValues: DependencyValues<Deps>) => void,
        success?: (value: T, dependencyValues: DependencyValues<Deps>) => void
        cleanup?: (value: T) => Promise<void>|void
        failure?: {
            maxRetryCount?: number
            retry?: (error: Error, failureLog: {
                runRetry: (newCallback?: typeof callback) => void,
                retryAttempt: number,
                maxRetryCount: number,
                errorLog: Array<Error>
            }) => void
            final?: (failureLog: {
                maxRetryCount: number,
                errorLog: Array<Error>
            }) => void
        }
    }, 
    UiComponent?: FC<{
        nodeDependencies: Result<T>,
        parentDependencies: DependencyValues<Deps>
    }>
    children: ReactNode
}) => {
    const parentDependencies = useContext(ParentStateMachineContext)
    const [nodeDependency, nodeTrigger] = useTriggeredResultEffect(callback, parentDependencies, lifecycleHandlers)
    return (
        <>
            {UiComponent && <UiComponent
                nodeDependencies={nodeDependency}
                parentDependencies={parentDependencies.map(dep => (dep as Result<any>  & { type: 'success' }).value) as { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never }}
            />}
            {nodeDependency.type === "success" && children}
        </>
    )
}

export const StateMachineJoint = ({
    parentDependencies,
}: {
    parentDependencies: Array<Result<any>>
    inlets: Array<typeof StateMachine>
    outlets: Array<typeof StateMachine>
}) => {
    
}


export const LatestAmiVersion = ({amiLayer, ubuntuVersion}: {
    amiLayer: string,
    ubuntuVersion: string
}) => <StateMachine
    key="latestAmiVersion"
    callback={async () => {
        // const imagesData = await ec2Client.send(new DescribeImagesCommand({
        //     Filters: [
        //         {
        //             Name: "name",
        //             Values: [`${composeAmiName({
        //                 amiLayer,
        //                 ubuntuVersion
        //             })}*`]
        //         }
        //     ]
        // }));
        // const sortedImages = imagesData.Images!.sort((a, b) => (a.CreationDate! > b.CreationDate! ? -1 : 1));
        // console.log(sortedImages[0]!.Name!)
        // return sortedImages[0]!.Name!.split('.').slice(1).map(str=>{
        //     return parseInt(str)
        // })
        return 5
    }}
    dependencies={[]}
    UiComponent={({nodeDependencies}) => {
        return <Text></Text>
    }}
/>

export const NextStagePrereqs = () => <StateMachine
    key="nextStagePrereqs"
    callback={async () => {
        return 5
    }}
    dependencies={[]}
    UiComponent={({nodeDependencies}) => {
        return <Text></Text>
    }}
/>