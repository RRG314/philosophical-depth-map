# Future data only. Fail closed without a reviewed design manifest; no automatic sample-size rule.
args <- commandArgs(trailingOnly=TRUE)
if(length(args)!=3) stop('Usage: Rscript analysis/calibrate.R wide.csv reviewed-design.rds output-directory')
plan <- readRDS(args[2])
required <- c('approved','preregistration','sample_justification','items','minimum_n','minimum_category_count','factors','anchors','group','seed')
if(!all(required %in% names(plan)) || !isTRUE(plan$approved) || !nzchar(plan$preregistration) || !nzchar(plan$sample_justification)) stop('Reviewed design and adequacy plan required')
if(!requireNamespace('mirt',quietly=TRUE)) stop('Install and lock reviewed mirt version')
d <- read.csv(args[1]); x <- d[,plan$items,drop=FALSE]
if(nrow(x)<plan$minimum_n || any(!is.na(as.matrix(x)) & !as.matrix(x) %in% 0:4)) stop('Sample or response categories inadequate')
for(item in names(x)) if(any(table(factor(x[[item]],levels=0:4))<plan$minimum_category_count)) stop('Sparse categories: revise design, do not collapse post hoc')
if(!plan$group %in% names(d) || !all(plan$anchors %in% names(x)) || !length(plan$anchors)) stop('Prespecified groups and anchor items required')
set.seed(plan$seed); dir.create(args[3],recursive=TRUE,showWarnings=FALSE)
# Explicit factor syntax allows multidimensional graded-response estimation.
fit <- mirt::mirt(x,model=plan$factors,itemtype='graded',SE=TRUE,verbose=FALSE)
if(!mirt::extract.mirt(fit,'converged')) stop('Model did not converge; no estimates released')
group <- factor(d[[plan$group]])
if(nlevels(group)<2) stop('At least two explicitly consented groups required')
mg <- mirt::multipleGroup(x,model=plan$factors,group=group,itemtype='graded',invariance=c(plan$anchors,'free_means','free_var'),SE=TRUE,verbose=FALSE)
if(!mirt::extract.mirt(mg,'converged')) stop('Group model did not converge')
# Test slope/threshold invariance on non-anchor items. DIF is not by itself proof of unfairness.
parameters <- c('a1',paste0('d',1:4))
dif <- mirt::DIF(mg,which.par=parameters,items2test=which(!names(x)%in%plan$anchors),scheme='add',p.adjust='BH')
saveRDS(list(model=fit,group_model=mg,dif=dif,plan=plan,session=sessionInfo()),file.path(args[3],'models.rds'))
writeLines(capture.output(sessionInfo()),file.path(args[3],'session-info.txt'))
